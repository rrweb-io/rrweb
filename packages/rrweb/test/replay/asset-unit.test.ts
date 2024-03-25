/**
 * @jest-environment jsdom
 */

import AssetManager from '../../src/replay/asset-manager';
import {
  EventType,
  SerializedBlobArg,
  assetEvent,
  captureAssetsParam,
} from '@rrweb/types';
import { updateSrcset } from '../../src/replay/asset-manager/update-srcset';

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
    assetManager = new AssetManager({ liveMode: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
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
    const createObjectURLSpy = jest
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
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL');

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
    jest.useFakeTimers();
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

    jest.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');

    jest.runAllTimers();

    await expect(promise).resolves.toEqual({
      status: 'loaded',
      url: 'objectURL',
    });
  });

  it('should send status reset to callbacks when reset', async () => {
    jest.useFakeTimers();
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
    jest.runAllTimers();

    await expect(promise).resolves.toEqual({ status: 'reset' });
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
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');

    const element = document.createElement('img');

    const promise = assetManager.manageAttribute(element, 1, 'src', url);

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
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
    await assetManager.add(event);

    const element = document.createElement('img');

    await assetManager.manageAttribute(element, 1, 'src', url);

    expect(element.getAttribute('src')).toBe('objectURL');
  });

  it('should be support srcset for previously loaded assets', async () => {
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
    await assetManager.add(event);

    const element = document.createElement('img');

    await assetManager.manageAttribute(element, 1, 'srcset', url);

    expect(element.getAttribute('srcset')).toBe('objectURL');
  });

  it('should be support partial srcset updates for previously loaded assets', async () => {
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
    await assetManager.add(event);

    const element = document.createElement('img');
    const value = `${url} x2, ${url}?x3 x3`;

    void assetManager.manageAttribute(element, 1, 'srcset', value);
    await assetManager.whenReady(url);

    expect(element.getAttribute('srcset')).toBe(`objectURL x2, ${url}?x3 x3`);
  });

  it('should support updating srcset in chunks for every time an asset is loaded', async () => {
    const url = 'https://example.com/image.png';
    const url2 = `${url}?x3`;
    const element = document.createElement('img');

    jest
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('objectURL1')
      .mockReturnValueOnce('objectURL2');
    await assetManager.add({
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    });

    void assetManager.manageAttribute(
      element,
      1,
      'srcset',
      `${url} x2, ${url2} x3`,
    );
    await assetManager.whenReady(url);

    expect(element.getAttribute('srcset')).toBe(`objectURL1 x2, ${url2} x3`);

    await assetManager.add({
      type: EventType.Asset,
      data: {
        url: url2,
        payload: examplePayload,
      },
    });

    await assetManager.whenReady(url2);

    expect(element.getAttribute('srcset')).toBe(`objectURL1 x2, objectURL2 x3`);
  });

  it('should support svg elements', async () => {
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
    await assetManager.add(event);

    // create svg element `feImage`
    const feImage = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'feImage',
    );

    await assetManager.manageAttribute(feImage, 1, 'href', url);

    expect(feImage.getAttribute('href')).toBe('objectURL');
  });

  describe('live mode', () => {
    beforeEach(() => {
      assetManager = new AssetManager({ liveMode: true });
    });

    it("should remove a node's attribute while asset is being loaded", async () => {
      const url = 'https://example.com/image.png';
      const element = document.createElement('embed');

      void assetManager.manageAttribute(element, 1, 'src', url);

      expect(element.getAttribute('src')).toBeNull();
    });

    it("should set an image's src attribute to //:0 to prevent a broken image icon while asset is being loaded", async () => {
      const url = 'https://example.com/image.png';
      const element = document.createElement('img');

      void assetManager.manageAttribute(element, 1, 'src', url);

      expect(element.getAttribute('src')).toBe('//:0');
    });

    it("should be able to modify a node's attribute multiple times", async () => {
      const originalUrl = 'https://example.com/original-image.png';
      const newUrl = 'https://example.com/new-image.png';
      const originalAsset: assetEvent = {
        type: EventType.Asset,
        data: {
          url: originalUrl,
          payload: examplePayload,
        },
      };
      const newAsset: assetEvent = {
        type: EventType.Asset,
        data: {
          url: newUrl,
          payload: examplePayload,
        },
      };
      let i = 0;
      jest
        .spyOn(URL, 'createObjectURL')
        .mockImplementation(() => `objectURL${(i += 1)}`);
      const promises: Promise<unknown>[] = [];

      const element = document.createElement('img');
      promises.push(
        assetManager.manageAttribute(element, 1, 'src', originalUrl),
      );

      promises.push(assetManager.manageAttribute(element, 1, 'src', newUrl));

      await assetManager.add(newAsset);
      await assetManager.add(originalAsset);

      await Promise.all(promises);
      expect(element.getAttribute('src')).toBe('objectURL1');
    });

    it("should be able to modify a node's attribute multiple times 2", async () => {
      const originalUrl = 'https://example.com/original-image.png';
      const newUrl = 'https://example.com/new-image.png';
      const originalAsset: assetEvent = {
        type: EventType.Asset,
        data: {
          url: originalUrl,
          payload: examplePayload,
        },
      };
      const newAsset: assetEvent = {
        type: EventType.Asset,
        data: {
          url: newUrl,
          payload: examplePayload,
        },
      };
      let i = 0;
      jest
        .spyOn(URL, 'createObjectURL')
        .mockImplementation(() => `objectURL${(i += 1)}`);
      const promises: Promise<unknown>[] = [];

      const element = document.createElement('img');
      promises.push(
        assetManager.manageAttribute(element, 1, 'src', originalUrl),
      );

      promises.push(assetManager.manageAttribute(element, 1, 'src', newUrl));

      await assetManager.add(originalAsset);
      await assetManager.add(newAsset);

      await Promise.all(promises);
      expect(element.getAttribute('src')).toBe('objectURL2');
    });
  });

  describe('updateSrcset()', () => {
    it('should update srcset attribute', () => {
      const element = document.createElement('img');
      element.setAttribute(
        'srcset',
        'https://example.com/image.png x2, https://example.com/image2.png x3',
      );
      const oldURL = 'https://example.com/image.png';
      const newURL = 'https://other-url.com/image.png';
      updateSrcset(element, oldURL, newURL);
      expect(element.getAttribute('srcset')).toBe(
        'https://other-url.com/image.png x2, https://example.com/image2.png x3',
      );
    });

    it('should update singular srcset attribute', () => {
      const element = document.createElement('img');
      element.setAttribute('srcset', 'https://example.com/image.png');
      const oldURL = 'https://example.com/image.png';
      const newURL = 'https://other-url.com/image.png';
      updateSrcset(element, oldURL, newURL);
      expect(element.getAttribute('srcset')).toBe(
        'https://other-url.com/image.png',
      );
    });

    it('should update srcset attribute with similar urls', () => {
      const element = document.createElement('img');
      element.setAttribute(
        'srcset',
        'https://example.com/image.png x2, https://example.com/image.png?x=3 x3',
      );
      const oldURL = 'https://example.com/image.png';
      const newURL = 'https://other-url.com/image.png';
      updateSrcset(element, oldURL, newURL);
      expect(element.getAttribute('srcset')).toBe(
        'https://other-url.com/image.png x2, https://example.com/image.png?x=3 x3',
      );
    });

    it('should update srcset attribute with similar urls - second url', () => {
      const element = document.createElement('img');
      element.setAttribute(
        'srcset',
        'https://example.com/image.png?x=2 x2, https://example.com/image.png x3',
      );
      const oldURL = 'https://example.com/image.png';
      const newURL = 'https://other-url.com/image.png';
      updateSrcset(element, oldURL, newURL);
      expect(element.getAttribute('srcset')).toBe(
        'https://example.com/image.png?x=2 x2, https://other-url.com/image.png x3',
      );
    });
  });
});
