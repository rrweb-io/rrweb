/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Mirror, snapshot } from 'rrweb-snapshot';
import MutationBuffer from '../../src/record/mutation';
import { ShadowDomManager } from '../../src/record/shadow-dom-manager';
import { mutationBuffers, forEachMutationBuffer } from '../../src/record/observer';
import type { MutationBufferParam } from '../../src/types';

type BypassOptions = ConstructorParameters<
  typeof ShadowDomManager
>[0]['bypassOptions'];

function childListMutation(
  target: Node,
  added: Node[] = [],
  removed: Node[] = [],
): MutationRecord {
  return {
    type: 'childList',
    target,
    addedNodes: added as unknown as NodeList,
    removedNodes: removed as unknown as NodeList,
    previousSibling: null,
    nextSibling: null,
    attributeName: null,
    attributeNamespace: null,
    oldValue: null,
  } as unknown as MutationRecord;
}

function createDropdown(doc: Document): {
  host: HTMLElement;
  header: HTMLElement;
  slot: HTMLSlotElement;
} {
  const host = doc.createElement('test-dropdown');
  const header = doc.createElement('span');
  header.setAttribute('slot', 'dropdown-head');
  header.textContent = 'Dropdown header';
  host.appendChild(header);
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const slot = doc.createElement('slot');
  slot.setAttribute('name', 'dropdown-head');
  shadowRoot.appendChild(slot);
  return { host, header, slot };
}

describe('Shadow observer lifecycle (regression)', () => {
  let doc: Document;
  let mirror: Mirror;
  let manager: ShadowDomManager;
  let buffer: MutationBuffer;
  let mutationCb: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = '';
    mirror = new Mirror();
    snapshot(doc, { mirror });
    mutationCb = vi.fn();

    const canvasManager = {
      addShadowRoot: vi.fn(),
      resetShadowRoots: vi.fn(),
      addWindow: vi.fn(),
      freeze: vi.fn(),
      unfreeze: vi.fn(),
      lock: vi.fn(),
      unlock: vi.fn(),
      reset: vi.fn(),
    };
    manager = new ShadowDomManager({
      mutationCb,
      scrollCb: vi.fn(),
      bypassOptions: {
        blockClass: 'rr-block',
        blockSelector: null,
        unblockSelector: null,
        maskAllText: false,
        maskTextClass: 'rr-mask',
        unmaskTextClass: null,
        maskTextSelector: null,
        unmaskTextSelector: null,
        inlineStylesheet: true,
        maskInputOptions: {},
        maskAttributeFn: undefined,
        maskTextFn: undefined,
        maskInputFn: undefined,
        keepIframeSrcFn: () => false,
        recordCanvas: false,
        inlineImages: false,
        sampling: {},
        slimDOMOptions: {},
        dataURLOptions: {},
        iframeManager: {
          addIframe: vi.fn(),
          attachIframe: vi.fn(),
        },
        stylesheetManager: {
          trackLinkElement: vi.fn(),
          attachLinkElement: vi.fn(),
        },
        canvasManager,
        processedNodeManager: {
          inOtherBuffer: () => false,
          add: () => undefined,
        },
        ignoreCSSAttributes: new Set<string>(),
      } as unknown as BypassOptions,
      mirror,
    });

    buffer = new MutationBuffer();
    buffer.init({
      mutationCb: vi.fn(),
      blockClass: 'rr-block',
      blockSelector: null,
      unblockSelector: null,
      maskAllText: false,
      maskTextClass: 'rr-mask',
      unmaskTextClass: null,
      maskTextSelector: null,
      unmaskTextSelector: null,
      inlineStylesheet: true,
      maskInputOptions: {},
      maskAttributeFn: undefined,
      maskTextFn: undefined,
      maskInputFn: undefined,
      keepIframeSrcFn: () => false,
      recordCanvas: false,
      inlineImages: false,
      slimDOMOptions: {},
      dataURLOptions: {},
      doc,
      mirror,
      iframeManager: {
        addIframe: vi.fn(),
        attachIframe: vi.fn(),
      },
      stylesheetManager: {
        trackLinkElement: vi.fn(),
        attachLinkElement: vi.fn(),
      },
      shadowDomManager: manager,
      canvasManager: { ...canvasManager },
      processedNodeManager: {
        inOtherBuffer: () => false,
        add: () => undefined,
      },
      ignoreCSSAttributes: new Set<string>(),
    } as unknown as MutationBufferParam);
  });

  afterEach(() => {
    // Undo the Element.prototype.attachShadow patch so other suites are unaffected.
    manager.reset();
    vi.restoreAllMocks();
  });

  it('disconnects the shadow observer when its host is removed', () => {
    const pushSpy = vi.spyOn(mutationBuffers, 'push');
    const { host } = createDropdown(doc);
    doc.body.appendChild(host);
    buffer.processMutations([childListMutation(doc.body, [host])]);
    const [shadowBuffer] = pushSpy.mock.calls.map((call) => call[0]);
    expect(mutationBuffers).toContain(shadowBuffer);

    host.remove();
    buffer.processMutations([childListMutation(doc.body, [], [host])]);

    expect(mutationBuffers).not.toContain(shadowBuffer);
  });

  it('does not accumulate one mutation buffer per removed component', () => {
    const baseline = mutationBuffers.length;
    const cycles = 5;
    for (let i = 0; i < cycles; i++) {
      const { host } = createDropdown(doc);
      doc.body.appendChild(host);
      buffer.processMutations([childListMutation(doc.body, [host])]);
      host.remove();
      buffer.processMutations([childListMutation(doc.body, [], [host])]);
    }
    // Mirror entries are released, so observer state must not grow either.
    expect(mutationBuffers.length - baseline).toBeLessThan(cycles);
  });

  it('releases nested shadow observers when an ancestor host is removed', () => {
    const pushSpy = vi.spyOn(mutationBuffers, 'push');
    const { host } = createDropdown(doc);
    const nestedHost = doc.createElement('inner-box');
    nestedHost.attachShadow({ mode: 'open' }).innerHTML = '<b>nested</b>';
    host.shadowRoot!.appendChild(nestedHost);
    doc.body.appendChild(host);
    buffer.processMutations([childListMutation(doc.body, [host])]);
    const baseline = mutationBuffers.length;
    expect(baseline).toBeGreaterThan(0);
    const shadowBuffers = pushSpy.mock.calls.map((call) => call[0]);

    host.remove();
    buffer.processMutations([childListMutation(doc.body, [], [host])]);

    expect(shadowBuffers).toHaveLength(2);
    shadowBuffers.forEach((shadowBuffer) =>
      expect(mutationBuffers).not.toContain(shadowBuffer),
    );
    expect(mutationBuffers.length).toBe(baseline - 2);
  });

  it('keeps observing a host that is moved instead of removed', () => {
    const disconnectSpy = vi.spyOn(
      window.MutationObserver.prototype,
      'disconnect',
    );
    const { host } = createDropdown(doc);
    const other = doc.createElement('div');
    doc.body.appendChild(other);
    doc.body.appendChild(host);
    buffer.processMutations([
      childListMutation(doc.body, [other]),
      childListMutation(doc.body, [host]),
    ]);
    const baseline = mutationBuffers.length;
    disconnectSpy.mockClear();

    // Move the host under `other`: removal + addition in one batch.
    other.appendChild(host);
    buffer.processMutations([
      childListMutation(doc.body, [], [host]),
      childListMutation(other, [host]),
    ]);

    expect(disconnectSpy).not.toHaveBeenCalled();
    expect(mutationBuffers.length).toBe(baseline);
  });

  it('observes a reinserted host again after release', () => {
    const { host } = createDropdown(doc);
    doc.body.appendChild(host);
    buffer.processMutations([childListMutation(doc.body, [host])]);
    const baseline = mutationBuffers.length;

    host.remove();
    buffer.processMutations([childListMutation(doc.body, [], [host])]);
    expect(mutationBuffers.length).toBe(baseline - 1);

    doc.body.appendChild(host);
    buffer.processMutations([childListMutation(doc.body, [host])]);
    expect(mutationBuffers.length).toBe(baseline);
  });

  it('unlocks every buffer when an earlier buffer is removed mid-loop', () => {
    const pushSpy = vi.spyOn(mutationBuffers, 'push');
    const { host: hostA } = createDropdown(doc);
    doc.body.appendChild(hostA);
    buffer.processMutations([childListMutation(doc.body, [hostA])]);
    const { slot: slotB, host: hostB } = createDropdown(doc);
    doc.body.appendChild(hostB);
    buffer.processMutations([childListMutation(doc.body, [hostB])]);
    const [shadowABuffer, shadowBBuffer] = pushSpy.mock.calls.map(
      (call) => call[0],
    );
    expect(shadowBBuffer).toBeDefined();

    forEachMutationBuffer((b) => b.lock());
    hostA.remove();
    shadowABuffer.processMutations([childListMutation(doc.body, [], [hostA])]);
    forEachMutationBuffer((b) => b.unlock());

    expect(mutationBuffers).not.toContain(shadowABuffer);
    mutationCb.mockClear();

    slotB.setAttribute('data-t', '1');
    shadowBBuffer.processMutations([
      {
        type: 'attributes',
        target: slotB,
        attributeName: 'data-t',
        attributeNamespace: null,
        oldValue: null,
        addedNodes: [] as unknown as NodeList,
        removedNodes: [] as unknown as NodeList,
        previousSibling: null,
        nextSibling: null,
      } as unknown as MutationRecord,
    ]);
    expect(mutationCb).toHaveBeenCalled();
  });
});
