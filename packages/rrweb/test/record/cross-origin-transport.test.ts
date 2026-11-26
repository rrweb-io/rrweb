/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mirror } from 'rrweb-snapshot';
import {
  EventType,
  IncrementalSource,
  NodeType,
  type eventWithTime,
  type listenerHandler,
  type serializedNodeWithId,
} from '@rrweb/types';
import record from '../../src/record';
import { IframeManager } from '../../src/record/iframe-manager';
import { StylesheetManager } from '../../src/record/stylesheet-manager';
import type {
  CrossOriginIframeMessageEventContent,
  CrossOriginIframeTransport,
} from '../../src/types';

const childSnapshot = (): serializedNodeWithId => ({
  type: NodeType.Document,
  id: 30,
  childNodes: [
    {
      type: NodeType.Element,
      tagName: 'p',
      attributes: { 'data-child': 'recorded' },
      id: 31,
      childNodes: [],
    },
  ],
});

const childMessage = (
  source: Window,
  event: eventWithTime = {
    type: EventType.FullSnapshot,
    timestamp: 1,
    data: { node: childSnapshot(), initialOffset: { top: 0, left: 0 } },
  },
) =>
  new MessageEvent<CrossOriginIframeMessageEventContent>('message', {
    source,
    origin: 'https://child.example',
    data: { type: 'rrweb', origin: 'https://child.example', event },
  });

describe('custom cross-origin iframe transport', () => {
  const cleanups: listenerHandler[] = [];

  afterEach(() => {
    cleanups.splice(0).forEach((stop) => stop());
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  const setup = () => {
    const receivers = new Map<Window, (message: MessageEvent) => void>();
    const stops = new Map<Window, ReturnType<typeof vi.fn>>();
    const transport: CrossOriginIframeTransport = {
      send: vi.fn(),
      subscribe: vi.fn((target, receive) => {
        receivers.set(target, receive);
        const stop = vi.fn(() => receivers.delete(target));
        stops.set(target, stop);
        return stop;
      }),
    };
    const mirror = new Mirror();
    const emit = vi.fn();
    const manager = new IframeManager({
      mirror,
      mutationCb: vi.fn(),
      stylesheetManager: new StylesheetManager({
        mutationCb: vi.fn(),
        adoptedStyleSheetCb: vi.fn(),
      }),
      recordCrossOriginIframes: true,
      crossOriginIframeTransport: transport,
      wrappedEmit: emit,
    });
    cleanups.push(() => manager.destroy());
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    mirror.add(iframe, {
      type: NodeType.Element,
      tagName: 'iframe',
      attributes: {},
      childNodes: [],
      id: 100,
    });
    manager.addIframe(iframe);
    return { manager, iframe, transport, receivers, stops, emit };
  };

  it('keeps source attribution, iframe attachment and mutation ID remapping', () => {
    const { iframe, receivers, emit } = setup();
    const receive = receivers.get(window)!;
    receive(childMessage(iframe.contentWindow!));

    const attached = emit.mock.calls[0][0];
    expect(attached.type).toBe(EventType.IncrementalSnapshot);
    expect(attached.data.isAttachIframe).toBe(true);
    expect(attached.data.adds[0].parentId).toBe(100);
    const remappedNode = attached.data.adds[0].node.childNodes[0];
    expect(remappedNode.id).not.toBe(31);
    expect(remappedNode.attributes['data-child']).toBe('recorded');

    receive(
      childMessage(iframe.contentWindow!, {
        type: EventType.IncrementalSnapshot,
        timestamp: 2,
        data: {
          source: IncrementalSource.Mutation,
          adds: [],
          removes: [],
          texts: [],
          attributes: [{ id: 31, attributes: { 'data-child': 'changed' } }],
        },
      }),
    );
    expect(emit.mock.calls[1][0].data.attributes).toEqual([
      { id: remappedNode.id, attributes: { 'data-child': 'changed' } },
    ]);
  });

  it('retains origin and known-source filters without listening to page messages', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { iframe, receivers, emit } = setup();
    expect(add.mock.calls.filter(([type]) => type === 'message')).toHaveLength(
      0,
    );
    const siteMessage = vi.fn();
    window.addEventListener('message', siteMessage);
    cleanups.push(() => window.removeEventListener('message', siteMessage));
    window.dispatchEvent(childMessage(iframe.contentWindow!));
    expect(siteMessage).toHaveBeenCalledOnce();
    expect(emit).not.toHaveBeenCalled();

    const message = childMessage(iframe.contentWindow!);
    receivers.get(window)!(
      new MessageEvent('message', {
        source: message.source,
        origin: 'https://forwarder.example',
        data: message.data,
      }),
    );
    receivers.get(window)!(childMessage(window));
    expect(emit).not.toHaveBeenCalled();
  });

  it('subscribes once on same-origin nested windows and disposes every subscription', () => {
    const { manager, iframe, transport, receivers, stops, emit } = setup();
    manager.attachIframe(iframe, childSnapshot());
    manager.attachIframe(iframe, childSnapshot());
    expect(transport.subscribe).toHaveBeenCalledTimes(2);
    expect(receivers.has(iframe.contentWindow!)).toBe(true);

    const nested = iframe.contentDocument!.createElement('iframe');
    iframe.contentDocument!.body.appendChild(nested);
    manager.addIframe(nested);
    receivers.get(iframe.contentWindow!)!(childMessage(nested.contentWindow!));
    expect(emit).toHaveBeenCalledOnce();
    expect(emit.mock.calls[0][0].data.isAttachIframe).toBe(true);
    expect(
      emit.mock.calls[0][0].data.adds[0].node.childNodes[0].attributes[
        'data-child'
      ],
    ).toBe('recorded');

    manager.destroy();
    manager.destroy();
    expect(receivers.size).toBe(0);
    for (const stop of stops.values()) expect(stop).toHaveBeenCalledOnce();
  });

  it('resubscribes reused iframe windows after pagehide but retains persisted pages', () => {
    const { manager, iframe, transport, receivers, stops, emit } = setup();
    const childWindow = iframe.contentWindow!;
    manager.attachIframe(iframe, childSnapshot());
    const originalStop = stops.get(childWindow)!;

    childWindow.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    );
    expect(originalStop).not.toHaveBeenCalled();
    expect(receivers.has(childWindow)).toBe(true);

    childWindow.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: false }),
    );
    expect(originalStop).toHaveBeenCalledOnce();
    expect(receivers.has(childWindow)).toBe(false);

    // jsdom does not navigate; reuse the same window identity to exercise the
    // manager's WindowProxy-keyed lifecycle independently of native navigation.
    manager.attachIframe(iframe, childSnapshot());
    manager.attachIframe(iframe, childSnapshot());
    expect(transport.subscribe).toHaveBeenCalledTimes(3);
    expect(receivers.has(childWindow)).toBe(true);

    const nested = iframe.contentDocument!.createElement('iframe');
    iframe.contentDocument!.body.appendChild(nested);
    manager.addIframe(nested);
    receivers.get(childWindow)!(childMessage(nested.contentWindow!));
    expect(emit).toHaveBeenCalledOnce();

    const replacementStop = stops.get(childWindow)!;
    manager.destroy();
    expect(originalStop).toHaveBeenCalledOnce();
    expect(replacementStop).toHaveBeenCalledOnce();
  });

  it('uses the custom sender instead of parent.postMessage', () => {
    const postMessage = vi.fn();
    const parent = {
      get document() {
        throw new DOMException('Cross-origin parent', 'SecurityError');
      },
      postMessage,
    };
    vi.spyOn(window, 'parent', 'get').mockReturnValue(
      parent as unknown as Window,
    );
    const send = vi.fn();
    const unsubscribe = vi.fn();
    const stop = record({
      recordCrossOriginIframes: true,
      recordDOM: false,
      crossOriginIframeTransport: {
        send,
        subscribe: () => unsubscribe,
      },
    });
    if (stop) cleanups.push(stop);
    document.dispatchEvent(new Event('DOMContentLoaded'));
    window.dispatchEvent(new Event('load'));
    record.addCustomEvent('transport', { recorded: true });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rrweb',
        origin: window.location.origin,
        event: expect.objectContaining({
          type: EventType.Custom,
          data: { tag: 'transport', payload: { recorded: true } },
        }),
      }),
    );
    expect(postMessage).not.toHaveBeenCalled();

    send.mockImplementation(() => {
      throw new Error('Custom transport unavailable');
    });
    expect(() => record.addCustomEvent('unavailable', null)).toThrow(
      'Custom transport unavailable',
    );
    expect(postMessage).not.toHaveBeenCalled();
    stop?.();
    expect(unsubscribe).toHaveBeenCalledOnce();
    cleanups.length = 0;
  });

  it('retains parent.postMessage when no custom transport is supplied', () => {
    const postMessage = vi.fn();
    const parent = {
      get document() {
        throw new DOMException('Cross-origin parent', 'SecurityError');
      },
      postMessage,
    };
    vi.spyOn(window, 'parent', 'get').mockReturnValue(
      parent as unknown as Window,
    );
    const stop = record({
      recordCrossOriginIframes: true,
      recordDOM: false,
    });
    if (stop) cleanups.push(stop);
    document.dispatchEvent(new Event('DOMContentLoaded'));
    window.dispatchEvent(new Event('load'));
    record.addCustomEvent('default', null);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rrweb',
        event: expect.objectContaining({
          type: EventType.Custom,
          data: { tag: 'default', payload: null },
        }),
      }),
      '*',
    );
  });
});
