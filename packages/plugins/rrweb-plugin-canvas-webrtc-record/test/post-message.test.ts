import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RRWebPluginCanvasWebRTCRecord } from '../src';
import type { CrossOriginIframeMessageEventContent } from '../src';

const listeners: EventListenerOrEventListenerObject[] = [];

beforeEach(() => {
  // happy-dom does not expose the browser's effective origin.
  Object.defineProperty(window, 'origin', {
    configurable: true,
    get: () => window.location.origin,
  });
});

afterEach(() => {
  for (const listener of listeners) {
    window.removeEventListener('message', listener);
  }
  listeners.length = 0;
  vi.restoreAllMocks();
});

function setup(recordCrossOriginIframes?: boolean) {
  const addListener = vi.spyOn(window, 'addEventListener');
  const plugin = new RRWebPluginCanvasWebRTCRecord({
    signalSendCallback: vi.fn(),
    ...(recordCrossOriginIframes === undefined
      ? {}
      : { recordCrossOriginIframes }),
  });
  for (const [type, listener] of addListener.mock.calls) {
    if (type === 'message') listeners.push(listener);
  }
  addListener.mockRestore();
  const setupStream = vi.spyOn(plugin, 'setupStream').mockReturnValue(false);
  const signalReceive = vi.spyOn(plugin, 'signalReceive').mockReturnValue();
  const signalReceiveFromCrossOriginIframe = vi
    .spyOn(plugin, 'signalReceiveFromCrossOriginIframe')
    .mockReturnValue();
  return {
    plugin,
    setupStream,
    signalReceive,
    signalReceiveFromCrossOriginIframe,
  };
}

function send(
  origin: string,
  data: CrossOriginIframeMessageEventContent['data'],
) {
  window.dispatchEvent(
    new MessageEvent('message', {
      origin,
      source: window,
      data: { type: 'rrweb-canvas-webrtc', data },
    }),
  );
}

const offer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'test offer' };

describe('canvas postMessage origin policy', () => {
  it.each([undefined, false])(
    'blocks every cross-origin command with opt-in %s',
    (optIn) => {
      const {
        plugin,
        setupStream,
        signalReceive,
        signalReceiveFromCrossOriginIframe,
      } = setup(optIn);
      send('https://attacker.example', {
        type: 'who-has-canvas',
        id: 1,
        rootId: 2,
      });
      send('https://attacker.example', { type: 'signal', signal: offer });
      send('https://attacker.example', { type: 'i-have-canvas', rootId: 2 });
      expect(setupStream).not.toHaveBeenCalled();
      expect(signalReceive).not.toHaveBeenCalled();
      expect(signalReceiveFromCrossOriginIframe).not.toHaveBeenCalled();
      expect(plugin['canvasWindowMap'].size).toBe(0);
    },
  );

  it.each(['', 'null'])(
    'blocks an untrusted origin %s by default',
    (origin) => {
      const { setupStream } = setup();
      send(origin, { type: 'who-has-canvas', id: 1, rootId: 2 });
      expect(setupStream).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    'preserves same-origin commands with opt-in %s',
    (optIn) => {
      const { plugin, setupStream, signalReceiveFromCrossOriginIframe } =
        setup(optIn);
      send(window.origin, { type: 'who-has-canvas', id: 1, rootId: 2 });
      send(window.origin, { type: 'signal', signal: offer });
      send(window.origin, { type: 'i-have-canvas', rootId: 2 });
      expect(setupStream).toHaveBeenCalledWith(1, 2);
      expect(signalReceiveFromCrossOriginIframe).toHaveBeenCalledWith(
        offer,
        window,
      );
      expect(plugin['canvasWindowMap'].get(2)).toBe(window);
    },
  );

  it('accepts cross-origin commands after explicit opt-in', () => {
    const { plugin, setupStream, signalReceiveFromCrossOriginIframe } =
      setup(true);
    send('https://trusted.example', {
      type: 'who-has-canvas',
      id: 1,
      rootId: 2,
    });
    send('https://trusted.example', { type: 'signal', signal: offer });
    send('https://trusted.example', { type: 'i-have-canvas', rootId: 2 });
    expect(setupStream).toHaveBeenCalledWith(1, 2);
    expect(signalReceiveFromCrossOriginIframe).toHaveBeenCalledWith(
      offer,
      window,
    );
    expect(plugin['canvasWindowMap'].get(2)).toBe(window);
  });

  it('does not equate opaque origins', () => {
    vi.spyOn(window, 'origin', 'get').mockReturnValue('null');
    const { setupStream } = setup();
    send('null', { type: 'who-has-canvas', id: 1, rootId: 2 });
    expect(setupStream).not.toHaveBeenCalled();
  });

  it('uses the effective origin in a sandboxed document', () => {
    vi.spyOn(window, 'origin', 'get').mockReturnValue('null');
    const { setupStream } = setup();
    send(window.location.origin, { type: 'who-has-canvas', id: 1, rootId: 2 });
    expect(setupStream).not.toHaveBeenCalled();
  });
});
