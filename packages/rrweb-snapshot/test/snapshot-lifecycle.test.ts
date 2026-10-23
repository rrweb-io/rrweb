/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import snapshot from '../src/snapshot';
import { Mirror } from '../src/utils';

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('snapshot callback lifetime', () => {
  it('does not serialize into the mirror after its signal was aborted', () => {
    const controller = new AbortController();
    const mirror = new Mirror();
    controller.abort();

    expect(
      snapshot(document, { mirror, signal: controller.signal }),
    ).toBeNull();
    expect(mirror.getIds()).toEqual([]);
  });

  it('cancels deferred iframe callbacks, timers, and later load events', async () => {
    vi.useFakeTimers();
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const controller = new AbortController();
    const mirror = new Mirror();
    const loaded: HTMLIFrameElement[] = [];
    snapshot(document, {
      mirror,
      signal: controller.signal,
      onIframeLoad: (frame) => loaded.push(frame),
    });
    const ids = mirror.getIds();

    controller.abort();
    iframe.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(5001);

    expect(loaded).toEqual([]);
    expect(mirror.getIds()).toEqual(ids);
  });

  it('cancels deferred stylesheet callbacks and their timeout', async () => {
    vi.useFakeTimers();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://rrweb.test/late.css';
    document.body.appendChild(link);
    const controller = new AbortController();
    const loaded: HTMLLinkElement[] = [];
    snapshot(document, {
      signal: controller.signal,
      onStylesheetLoad: (stylesheet) => loaded.push(stylesheet),
    });

    controller.abort();
    link.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(5001);

    expect(loaded).toEqual([]);
  });
});
