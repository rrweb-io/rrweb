import { RRDocument, RRNode } from '../src/document-nodejs';
import {
  polyfillPerformance,
  polyfillRAF,
  polyfillEvent,
  polyfillNode,
  polyfillDocument,
} from '../src/polyfill';

describe('polyfill for nodejs', () => {
  it('should polyfill performance api', () => {
    expect(global.performance).toBeUndefined();
    polyfillPerformance();
    expect(global.performance).toBeDefined();
    expect(performance).toBeDefined();
    expect(performance.now).toBeDefined();
    expect(performance.now()).toBeCloseTo(
      require('perf_hooks').performance.now(),
      1e-10,
    );
  });

  it('should polyfill requestAnimationFrame', () => {
    expect(global.requestAnimationFrame).toBeUndefined();
    expect(global.cancelAnimationFrame).toBeUndefined();
    polyfillRAF();
    expect(global.requestAnimationFrame).toBeDefined();
    expect(global.cancelAnimationFrame).toBeDefined();
    expect(requestAnimationFrame).toBeDefined();
    expect(cancelAnimationFrame).toBeDefined();

    jest.useFakeTimers();
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
    jest.runAllTimers();

    let rafHandle;
    const rafCallback2 = () => {
      rafHandle = requestAnimationFrame(rafCallback2);
    };
    rafHandle = requestAnimationFrame(rafCallback2);

    // If this function doesn't work, recursive function will never end.
    cancelAnimationFrame(rafHandle);
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('should polyfill Event type', () => {
    polyfillEvent();
    expect(global.Event).toBeDefined();
    expect(Event).toBeDefined();
  });

  it('should polyfill Node type', () => {
    expect(global.Node).toBeUndefined();
    polyfillNode();
    expect(global.Node).toBeDefined();
    expect(Node).toBeDefined();
    expect(Node).toEqual(RRNode);
  });

  it('should polyfill document object', () => {
    expect(global.document).toBeUndefined();
    polyfillDocument();
    expect(global.document).toBeDefined();
    expect(document).toBeDefined();
    expect(document).toBeInstanceOf(RRDocument);
  });
});
