/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import type { Mirror } from 'rrweb-snapshot';
import type { IWindow, captureAssetsParam } from '@rrweb/types';
import AssetManager from '../../src/record/observers/asset-manager';

const setCurrentSrc = (img: HTMLImageElement, value: string) => {
  Object.defineProperty(img, 'currentSrc', { value, configurable: true });
};

const makeManager = (attributeMutationCb: ReturnType<typeof vi.fn>) => {
  return new AssetManager({
    mutationCb: vi.fn(),
    attributeMutationCb,
    mirror: { getId: () => 42 } as unknown as Mirror,
    win: window as unknown as IWindow,
    captureAssets: { origins: true } as captureAssetsParam,
  });
};

describe('record AssetManager currentSrc re-pin', () => {
  it('emits a rr_captured_src attribute mutation when currentSrc resolves (Option A)', () => {
    const attributeMutationCb = vi.fn();
    const manager = makeManager(attributeMutationCb);

    const img = document.createElement('img');
    img.setAttribute('srcset', 'https://example.com/a.jpg');
    const status = manager.capture({
      element: img,
      attr: 'srcset',
      value: 'https://example.com/a.jpg',
    });
    expect(status.status).toBe('not-current-src');
    expect(attributeMutationCb).not.toHaveBeenCalled();

    setCurrentSrc(img, 'https://example.com/a.jpg');
    img.dispatchEvent(new Event('load'));

    expect(attributeMutationCb).toHaveBeenCalledWith({
      adds: [],
      removes: [],
      texts: [],
      attributes: [
        {
          id: 42,
          attributes: { rr_captured_src: 'https://example.com/a.jpg' },
        },
      ],
    });
  });

  it('does not re-emit when a load fires without a currentSrc change', () => {
    const attributeMutationCb = vi.fn();
    const manager = makeManager(attributeMutationCb);

    const img = document.createElement('img');
    img.setAttribute('srcset', 'https://example.com/a.jpg');
    setCurrentSrc(img, 'https://example.com/a.jpg');
    manager.capture({
      element: img,
      attr: 'srcset',
      value: 'https://example.com/a.jpg',
    });

    img.dispatchEvent(new Event('load'));
    expect(attributeMutationCb).not.toHaveBeenCalled();
  });

  it('re-pins again on a subsequent currentSrc change (listener is repeatable)', () => {
    const attributeMutationCb = vi.fn();
    const manager = makeManager(attributeMutationCb);

    const img = document.createElement('img');
    img.setAttribute('srcset', 'https://example.com/a.jpg');
    setCurrentSrc(img, 'https://example.com/a.jpg');
    manager.capture({
      element: img,
      attr: 'srcset',
      value: 'https://example.com/a.jpg',
    });

    setCurrentSrc(img, 'https://example.com/b.jpg');
    img.dispatchEvent(new Event('load'));
    setCurrentSrc(img, 'https://example.com/c.jpg');
    img.dispatchEvent(new Event('load'));

    expect(attributeMutationCb).toHaveBeenCalledTimes(2);
    expect(attributeMutationCb).toHaveBeenLastCalledWith({
      adds: [],
      removes: [],
      texts: [],
      attributes: [
        {
          id: 42,
          attributes: { rr_captured_src: 'https://example.com/c.jpg' },
        },
      ],
    });
  });

  it('only attaches one load listener per image across repeated captures', () => {
    const attributeMutationCb = vi.fn();
    const manager = makeManager(attributeMutationCb);

    const img = document.createElement('img');
    img.setAttribute('srcset', 'https://example.com/a.jpg');
    setCurrentSrc(img, 'https://example.com/a.jpg');
    manager.capture({ element: img, attr: 'srcset', value: 'x' });
    manager.capture({ element: img, attr: 'srcset', value: 'x' });

    setCurrentSrc(img, 'https://example.com/b.jpg');
    img.dispatchEvent(new Event('load'));

    expect(attributeMutationCb).toHaveBeenCalledTimes(1);
  });
});
