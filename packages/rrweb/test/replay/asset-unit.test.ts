/**
 * @vitest-environment jsdom
 */

import AssetManager from '../../src/replay/asset-manager';
import {
  EventType,
  SerializedBlobArg,
  SerializedCssTextArg,
  assetEvent,
  captureAssetsParam,
} from '@rrweb/types';
import { createCache } from 'rrweb-snapshot';
import { updateSrcset } from '../../src/replay/asset-manager/update-srcset';
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

  const exampleCssPayload: SerializedCssTextArg = {
    rr_type: 'CssText',
    cssTexts: ['body { background: red; }'],
  };

  beforeAll(() => {
    // https://github.com/jsdom/jsdom/issues/1721
    if (typeof window.URL.createObjectURL === 'undefined') {
      useURLPolyfill = true;
      window.URL.createObjectURL = () => '';
    }
  });

  beforeEach(() => {
    assetManager = new AssetManager({ liveMode: false, cache: createCache() });
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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
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

    vi.spyOn(URL, 'createObjectURL')
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

  it('keeps loaded srcset sources and leaves failed ones at their recorded url', async () => {
    const loadedUrl = 'https://example.com/loaded.png';
    const failedUrl = 'https://example.com/failed.png';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
    await assetManager.add({
      type: EventType.Asset,
      data: { url: loadedUrl, payload: examplePayload },
    });
    await assetManager.add({
      type: EventType.Asset,
      data: { url: failedUrl, failed: { message: 'network error' } },
    });

    const element = document.createElement('img');
    await assetManager.manageAttribute(
      element,
      1,
      'srcset',
      `${loadedUrl} 1x, ${failedUrl} 2x`,
    );

    // only the loaded source is swapped; the failed one is left as recorded
    expect(element.getAttribute('srcset')).toBe(
      `objectURL 1x, ${failedUrl} 2x`,
    );
  });

  it('reverts the whole srcset to the recorded value only when every source fails', async () => {
    const url1 = 'https://example.com/a.png';
    const url2 = 'https://example.com/b.png';
    await assetManager.add({
      type: EventType.Asset,
      data: { url: url1, failed: { message: 'network error' } },
    });
    await assetManager.add({
      type: EventType.Asset,
      data: { url: url2, failed: { message: 'network error' } },
    });

    const element = document.createElement('img');
    const value = `${url1} 1x, ${url2} 2x`;
    await assetManager.manageAttribute(element, 1, 'srcset', value);

    expect(element.getAttribute('srcset')).toBe(value);
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
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('objectURL');
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
      assetManager = new AssetManager({ liveMode: true, cache: createCache() });
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

    it("should be able to modify a node's attribute multiple times (assets arrive in reverse order)", async () => {
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
      vi.spyOn(URL, 'createObjectURL').mockImplementation(
        () => `objectURL${(i += 1)}`,
      );
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

    it("should be able to modify a node's attribute multiple times (assets arrive in correct order)", async () => {
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
      vi.spyOn(URL, 'createObjectURL').mockImplementation(
        () => `objectURL${(i += 1)}`,
      );
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

  describe('stylesheets', () => {
    it('should rebuild stylesheets from assets', () => {
      const url = 'https://example.com/index.css';
      const event: assetEvent = {
        type: EventType.Asset,
        data: {
          url,
          payload: exampleCssPayload,
        },
      };
      void assetManager.add(event);

      // no need for deserializeArg so should be loaded immediately
      expect(assetManager.get(url)).toEqual({
        cssTexts: ['body { background: red; }'],
        status: 'loaded',
        url,
      });
    });

    it('injects an @import fallback into a link-derived <style> when the stylesheet asset failed', async () => {
      const url = 'https://example.com/style.css';
      await assetManager.add({
        type: EventType.Asset,
        data: { url, failed: { message: 'network error' } },
      });

      // a <link rel=stylesheet> is rebuilt as an (empty) <style> on replay
      const style = document.createElement('style');
      await assetManager.manageAttribute(style, 1, 'href', url);

      expect(style.textContent).toBe(`@import url("${url}");`);
    });

    it('does not duplicate the @import fallback if the failed link is managed again', async () => {
      const url = 'https://example.com/style.css';
      await assetManager.add({
        type: EventType.Asset,
        data: { url, failed: { message: 'network error' } },
      });

      const style = document.createElement('style');
      await assetManager.manageAttribute(style, 1, 'href', url);
      await assetManager.manageAttribute(style, 1, 'href', url);

      expect(style.textContent).toBe(`@import url("${url}");`);
      expect(style.childNodes).toHaveLength(1);
    });

    it('escapes the url in the @import fallback to prevent breaking out of url("...")', async () => {
      const url = 'https://example.com/a").png;}body{display:none}/*';
      await assetManager.add({
        type: EventType.Asset,
        data: { url, failed: { message: 'network error' } },
      });

      const style = document.createElement('style');
      await assetManager.manageAttribute(style, 1, 'href', url);

      // the embedded " is backslash-escaped so it can't terminate url("...")
      expect(style.textContent).toBe(
        '@import url("https://example.com/a\\").png;}body{display:none}/*");',
      );
    });

    it('does not inject an @import fallback for a non-link (adopted/inline) style', async () => {
      // adopted/inline styles arrive via rr_css_text, which is erased to '' -
      // only real external links (attribute === 'href') get the @import
      const url = 'https://example.com/#rr_style_el:1';
      await assetManager.add({
        type: EventType.Asset,
        data: { url, failed: { message: 'network error' } },
      });

      const style = document.createElement('style');
      await assetManager.manageAttribute(style, 1, '', url);

      expect(style.textContent).toBe('');
    });
  });
});
