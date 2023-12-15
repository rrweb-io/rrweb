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
    assetManager = new AssetManager(
      { liveMode: false },
      {
        origins: true,
        objectURLs: true,
      },
    );
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

  const validOriginCombinations: Array<
    [captureAssetsParam['origins'], string[]]
  > = [
    [['http://example.com'], ['http://example.com/image.png']],
    [['https://example.com'], ['https://example.com/image.png']],
    [['https://example.com:80'], ['https://example.com:80/cgi-bin/image.png']],
    [true, ['https://example.com:80/cgi-bin/image.png']],
  ];

  const invalidOriginCombinations: Array<
    [captureAssetsParam['origins'], string[]]
  > = [
    [['http://example.com'], ['https://example.com/image.png']],
    [['https://example.com'], ['https://example.org/image.png']],
    [['https://example.com:80'], ['https://example.com:81/image.png']],
    [false, ['https://example.com:81/image.png']],
  ];

  validOriginCombinations.forEach(([origin, urls]) => {
    const assetManager = new AssetManager(
      { liveMode: false },
      {
        origins: origin,
        objectURLs: false,
      },
    );
    urls.forEach((url) => {
      it(`should correctly identify ${url} as cacheable for origin ${origin}`, () => {
        expect(assetManager.isURLOfCacheableOrigin(url)).toBe(true);
      });
    });
  });

  invalidOriginCombinations.forEach(([origin, urls]) => {
    const assetManager = new AssetManager(
      { liveMode: false },
      {
        origins: origin,
        objectURLs: false,
      },
    );
    urls.forEach((url) => {
      it(`should correctly identify ${url} as NOT cacheable for origin ${origin}`, () => {
        expect(assetManager.isURLOfCacheableOrigin(url)).toBe(false);
      });
    });
  });

  const validCombinations: Array<{
    origins: captureAssetsParam['origins'];
    tagName: string;
    attribute: string;
    value: string;
  }> = [
    {
      origins: ['http://example.com'],
      tagName: 'IMG',
      attribute: 'src',
      value: 'http://example.com/image.png',
    },
    {
      origins: ['https://example.com'],
      tagName: 'IMG',
      attribute: 'srcset',
      value:
        'https://example.com/image.png x2, https://example.com/image2.png x3',
    },
  ];

  const invalidCombinations: Array<{
    origins: captureAssetsParam['origins'];
    tagName: string;
    attribute: string;
    value: string;
  }> = [
    {
      origins: ['http://example.com'],
      tagName: 'IMG',
      attribute: 'src',
      value: 'http://google.com/image.png',
    },
    {
      origins: ['https://example.com'],
      tagName: 'IMG',
      attribute: 'href',
      value: 'https://example.com/image.png',
    },
    {
      origins: ['https://duckduckgo.com'],
      tagName: 'IMG',
      attribute: 'srcset',
      value:
        'https://example.com/image.png x2, https://example.com/image2.png x3',
    },
    {
      origins: false,
      tagName: 'IMG',
      attribute: 'srcset',
      value:
        'https://example.com/image.png x2, https://example.com/image2.png x3',
    },
  ];

  validCombinations.forEach(({ origins, tagName, attribute, value }) => {
    const element = document.createElement(tagName);
    element.setAttribute(attribute, value);
    const assetManager = new AssetManager(
      { liveMode: false },
      {
        origins,
        objectURLs: false,
      },
    );
    it(`should correctly identify <${element} ${attribute}=${value} /> as cacheable for origins ${origins}`, () => {
      expect(assetManager.isCacheable(element, attribute, value)).toBe(true);
    });
  });

  invalidCombinations.forEach(({ origins, tagName, attribute, value }) => {
    const element = document.createElement(tagName);
    element.setAttribute(attribute, value);
    const assetManager = new AssetManager(
      { liveMode: false },
      {
        origins,
        objectURLs: false,
      },
    );
    it(`should correctly identify <${element} ${attribute}=${value} /> as NOT cacheable for origins ${origins}`, () => {
      expect(assetManager.isCacheable(element, attribute, value)).toBe(false);
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
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');

    const element = document.createElement('img');
    element.setAttribute('src', url);

    const promise = assetManager.manageAttribute(element, 1, 'src');

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
    element.setAttribute('src', url);

    await assetManager.manageAttribute(element, 1, 'src');

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
    element.setAttribute('srcset', url);

    await assetManager.manageAttribute(element, 1, 'srcset');

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
    element.setAttribute('srcset', `${url} x2, ${url}?x3 x3`);

    void assetManager.manageAttribute(element, 1, 'srcset');
    await assetManager.whenReady(url);

    expect(element.getAttribute('srcset')).toBe(`objectURL x2, ${url}?x3 x3`);
  });

  it('should support updating srcset in chunks for every time an asset is loaded', async () => {
    const url = 'https://example.com/image.png';
    const url2 = `${url}?x3`;
    const element = document.createElement('img');
    element.setAttribute('srcset', `${url} x2, ${url2} x3`);

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

    void assetManager.manageAttribute(element, 1, 'srcset');
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

  describe('live mode', () => {
    beforeEach(() => {
      assetManager = new AssetManager(
        { liveMode: true },
        {
          origins: true,
          objectURLs: true,
        },
      );
    });

    it("should remove a node's attribute while asset is being loaded", async () => {
      const url = 'https://example.com/image.png';
      const element = document.createElement('embed');
      element.setAttribute('src', url);

      void assetManager.manageAttribute(element, 1, 'src');

      expect(element.getAttribute('src')).toBeNull();
    });

    it("should set an image's src attribute to //:0 to prevent a broken image icon while asset is being loaded", async () => {
      const url = 'https://example.com/image.png';
      const element = document.createElement('img');
      element.setAttribute('src', url);

      void assetManager.manageAttribute(element, 1, 'src');

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
      element.setAttribute('src', originalUrl);
      promises.push(assetManager.manageAttribute(element, 1, 'src'));

      element.setAttribute('src', newUrl);
      promises.push(assetManager.manageAttribute(element, 1, 'src'));

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
      element.setAttribute('src', originalUrl);
      promises.push(assetManager.manageAttribute(element, 1, 'src'));

      element.setAttribute('src', newUrl);
      promises.push(assetManager.manageAttribute(element, 1, 'src'));

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
