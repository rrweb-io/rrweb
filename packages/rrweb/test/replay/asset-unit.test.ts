/**
 * @vitest-environment jsdom
 */

import AssetManager from '../../src/replay/assets';
import { EventType, SerializedBlobArg, assetEvent } from '@rrweb/types';
import { vi } from 'vitest';

describe('AssetManager', () => {
  let assetManager: AssetManager;
  let useURLPolyfill = false;
  const examplePayload: SerializedBlobArg = {
    rr_type: 'Blob',
    type: 'image/png',
    data: [
      {
        rr_type: 'ArrayBuffer',
        base64: 'fake-base64-abcd',
      },
    ],
  };

  beforeAll(() => {
    // https://github.com/jsdom/jsdom/issues/1721
    if (typeof window.URL.createObjectURL === 'undefined') {
      useURLPolyfill = true;
      window.URL.createObjectURL = () => '';
    }
  });

  beforeEach(() => {
    assetManager = new AssetManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterAll(() => {
    if (useURLPolyfill) {
      delete (window.URL as any).createObjectURL;
    }
  });

  it('should add an asset to the manager', async () => {
    const url = 'https://example.com/image.png';

    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('objectURL');

    await assetManager.add(event);

    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(assetManager.get(url)).toEqual({
      status: 'loaded',
      url: 'objectURL',
    });
  });

  it('should not add a failed asset to the manager', async () => {
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: { url, failed: { message: 'failed to load file' } },
    };
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');

    await assetManager.add(event);

    expect(createObjectURLSpy).not.toHaveBeenCalled();
    expect(assetManager.get(url)).toEqual({ status: 'failed' });
  });

  it('should return the correct status for a loading asset', () => {
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    void assetManager.add(event);

    expect(assetManager.get(url)).toEqual({ status: 'loading' });
  });

  it('should return the correct status for an unknown asset', () => {
    const url = 'https://example.com/image.png';

    expect(assetManager.get(url)).toEqual({ status: 'unknown' });
  });

  it('should execute hook when an asset is added', async () => {
    vi.useFakeTimers();
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    void assetManager.add(event);
    const promise = assetManager.whenReady(url);

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');

    vi.runAllTimers();

    await expect(promise).resolves.toEqual({
      status: 'loaded',
      url: 'objectURL',
    });
  });

  it('should send status reset to callbacks when reset', async () => {
    vi.useFakeTimers();
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    void assetManager.add(event);
    const promise = assetManager.whenReady(url);

    assetManager.reset();
    vi.runAllTimers();

    await expect(promise).resolves.toEqual({ status: 'reset' });
  });

  const validCombinations = [
    ['img', ['src', 'srcset']],
    ['video', ['src']],
    ['audio', ['src']],
    ['embed', ['src']],
    ['source', ['src']],
    ['track', ['src']],
    ['input', ['src']],
    ['iframe', ['src']],
    ['object', ['src']],
  ] as const;

  const invalidCombinations = [
    ['img', ['href']],
    ['script', ['href']],
    ['link', ['src']],
    ['video', ['href']],
    ['audio', ['href']],
    ['div', ['src']],
    ['source', ['href']],
    ['track', ['href']],
    ['input', ['href']],
    ['iframe', ['href']],
    ['object', ['href']],
  ] as const;

  validCombinations.forEach(([tagName, attributes]) => {
    const element = document.createElement(tagName);
    attributes.forEach((attribute) => {
      it(`should correctly identify <${tagName} ${attribute}> as cacheable`, () => {
        expect(assetManager.isAttributeCacheable(element, attribute)).toBe(
          true,
        );
      });
    });
  });

  invalidCombinations.forEach(([tagName, attributes]) => {
    const element = document.createElement(tagName);
    attributes.forEach((attribute) => {
      it(`should correctly identify <${tagName} ${attribute}> as NOT cacheable`, () => {
        expect(assetManager.isAttributeCacheable(element, attribute)).toBe(
          false,
        );
      });
    });
  });

  it("should be able to modify a node's attribute once asset is loaded", async () => {
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');

    const element = document.createElement('img');
    element.setAttribute('src', url);

    const promise = assetManager.manageAttribute(element, 'src');

    await assetManager.add(event);
    await promise;

    expect(element.getAttribute('src')).toBe('objectURL');
  });

  it("should be able to modify a node's attribute for previously loaded assets", async () => {
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
    await assetManager.add(event);

    const element = document.createElement('img');
    element.setAttribute('src', url);

    await assetManager.manageAttribute(element, 'src');

    expect(element.getAttribute('src')).toBe('objectURL');
  });
});
