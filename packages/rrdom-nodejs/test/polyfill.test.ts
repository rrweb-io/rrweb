import { describe, it, expect, vi } from 'vitest';
import { compare } from 'compare-versions';
import { RRDocument } from '../src/document-nodejs';
import {
  polyfillPerformance,
  polyfillRAF,
  polyfillEvent,
  polyfillNode,
  polyfillDocument,
} from '../src/polyfill';
import { performance as nativePerformance } from 'perf_hooks';
import { BaseRRNode } from '@saola.ai/rrdom';

describe('polyfill for nodejs', () => {
  it('should polyfill performance api', () => {
    if (compare(process.version, 'v16.0.0', '<'))
      expect(global.performance).toBeUndefined();
    polyfillPerformance();
    expect(global.performance).toBeDefined();
    expect(performance).toBeDefined();
    expect(performance.now).toBeDefined();
    expect(performance.now()).toBeCloseTo(nativePerformance.now(), 1e-10);
  });

  it('should not polyfill performance if it already exists', () => {
    if (compare(process.version, 'v16.0.0', '>=')) {
      const originalPerformance = global.performance;
      polyfillPerformance();
      expect(global.performance).toBe(originalPerformance);
    }
    const fakePerformance = vi.fn() as unknown as Performance;
    global.performance = fakePerformance;
    polyfillPerformance();
    expect(global.performance).toEqual(fakePerformance);
  });

  it('should polyfill requestAnimationFrame', () => {
    expect(global.requestAnimationFrame).toBeUndefined();
    expect(global.cancelAnimationFrame).toBeUndefined();
    polyfillRAF();
    expect(global.requestAnimationFrame).toBeDefined();
    expect(global.cancelAnimationFrame).toBeDefined();
    expect(requestAnimationFrame).toBeDefined();
    expect(cancelAnimationFrame).toBeDefined();

    vi.useFakeTimers();
    const AnimationTime = 1_000; // target animation time(unit: ms)
    const startTime = Date.now();
    let frameCount = 0;
    const rafCallback1 = () => {
      const currentTime = Date.now();
      frameCount++;
      if (currentTime - startTime < AnimationTime) {
        requestAnimationFrame(rafCallback1);
      } else {
        expect(frameCount).toBeGreaterThanOrEqual(55);
        expect(frameCount).toBeLessThanOrEqual(65);
      }
    };
    requestAnimationFrame(rafCallback1);
    // Fast-forward until all timers have been executed
    vi.runAllTimers();

    let rafHandle;
    const rafCallback2 = () => {
      rafHandle = requestAnimationFrame(rafCallback2);
    };
    rafHandle = requestAnimationFrame(rafCallback2);

    // If this function doesn't work, recursive function will never end.
    cancelAnimationFrame(rafHandle);
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('should not polyfill requestAnimationFrame if it already exists', () => {
    const fakeRequestAnimationFrame =
      vi.fn() as unknown as typeof global.requestAnimationFrame;
    global.requestAnimationFrame = fakeRequestAnimationFrame;
    const fakeCancelAnimationFrame =
      vi.fn() as unknown as typeof global.cancelAnimationFrame;
    global.cancelAnimationFrame = fakeCancelAnimationFrame;
    polyfillRAF();
    expect(global.requestAnimationFrame).toBe(fakeRequestAnimationFrame);
    expect(global.cancelAnimationFrame).toBe(fakeCancelAnimationFrame);
  });

  it('should polyfill Event type', () => {
    // if the second version is greater
    if (compare(process.version, 'v15.0.0', '<'))
      expect(global.Event).toBeUndefined();
    polyfillEvent();
    expect(global.Event).toBeDefined();
    expect(Event).toBeDefined();
  });

  it('should not polyfill Event type if it already exists', () => {
    const fakeEvent = vi.fn() as unknown as typeof global.Event;
    global.Event = fakeEvent;
    polyfillEvent();
    expect(global.Event).toBe(fakeEvent);
  });

  it('should polyfill Node type', () => {
    expect(global.Node).toBeUndefined();
    polyfillNode();
    expect(global.Node).toBeDefined();
    expect(Node).toBeDefined();
    expect(Node).toEqual(BaseRRNode);
  });

  it('should not polyfill Node type if it already exists', () => {
    const fakeNode = vi.fn() as unknown as typeof global.Node;
    global.Node = fakeNode;
    polyfillNode();
    expect(global.Node).toBe(fakeNode);
  });

  it('should polyfill document object', () => {
    expect(global.document).toBeUndefined();
    polyfillDocument();
    expect(global.document).toBeDefined();
    expect(document).toBeDefined();
    expect(document).toBeInstanceOf(RRDocument);
  });

  it('should not polyfill document object if it already exists', () => {
    const fakeDocument = vi.fn() as unknown as typeof global.document;
    global.document = fakeDocument;
    polyfillDocument();
    expect(global.document).toBe(fakeDocument);
  });
});
