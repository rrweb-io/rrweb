import { BaseRRNode } from '@saola.ai/rrdom';
import { RRDocument } from './document-nodejs';

/**
 * Polyfill the performance for nodejs.
 * Note: The performance api is available through the global object from nodejs v16.0.0.
 * https://github.com/nodejs/node/pull/37970
 */
export function polyfillPerformance() {
  if (typeof window !== 'undefined' || 'performance' in global) return;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
  const performance = require('perf_hooks').performance;
  ((global as Window & typeof globalThis).performance as unknown) = performance;
}

/**
 * Polyfill requestAnimationFrame and cancelAnimationFrame for nodejs.
 */
export function polyfillRAF() {
  if (typeof window !== 'undefined' || 'requestAnimationFrame' in global)
    return;

  const FPS = 60,
    INTERVAL = 1_000 / FPS;
  let timeoutHandle: NodeJS.Timeout | null = null,
    rafCount = 0,
    requests = Object.create(null) as Record<string, (time: number) => void>;

  function onFrameTimer() {
    const currentRequests = requests;
    requests = Object.create(null) as Record<string, (time: number) => void>;
    timeoutHandle = null;
    Object.keys(currentRequests).forEach(function (id) {
      const request = currentRequests[id];
      if (request) request(Date.now());
    });
  }

  function requestAnimationFrame(callback: (timestamp: number) => void) {
    const cbHandle = ++rafCount;
    requests[cbHandle] = callback;
    if (timeoutHandle === null)
      timeoutHandle = setTimeout(onFrameTimer, INTERVAL);
    return cbHandle;
  }

  function cancelAnimationFrame(handleId: number) {
    delete requests[handleId];
    if (Object.keys(requests).length === 0 && timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  }

  (global as Window & typeof globalThis).requestAnimationFrame =
    requestAnimationFrame;
  (global as Window & typeof globalThis).cancelAnimationFrame =
    cancelAnimationFrame;
}

/**
 * Try to polyfill Event type.
 * The implementation of Event so far is empty because rrweb doesn't strongly depend on it in nodejs mode.
 * Note: The Event class is available through the global object from nodejs v15.0.0.
 */
export function polyfillEvent() {
  if (typeof Event !== 'undefined') return;
  (global.Event as unknown) = function () {
    //
  };
}

/**
 * Polyfill Node type with BaseRRNode for nodejs.
 */
export function polyfillNode() {
  if (typeof Node !== 'undefined') return;
  (global.Node as unknown) = BaseRRNode;
}

/**
 *  Polyfill document object with RRDocument for nodejs.
 */
export function polyfillDocument() {
  if (typeof document !== 'undefined') return;
  const rrdom = new RRDocument();
  (() => {
    rrdom.appendChild(rrdom.createElement('html'));
    rrdom.documentElement?.appendChild(rrdom.createElement('head'));
    rrdom.documentElement?.appendChild(rrdom.createElement('body'));
  })();
  global.document = rrdom as unknown as Document;
}
