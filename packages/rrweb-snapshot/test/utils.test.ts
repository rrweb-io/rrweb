/**
 * @vitest-environment jsdom
 */
import { describe, it, test, expect } from 'vitest';
import {
  escapeImportStatement,
  extractFileExtension,
  fixSafariColons,
  shouldIgnoreAsset,
  isAttributeCapturable,
  shouldCaptureAsset,
  isNodeMetaEqual,
} from '../src/utils';
import { NodeType } from '@rrweb/types';
import type { serializedNode, serializedNodeWithId } from '@rrweb/types';

describe('utils', () => {
  describe('isNodeMetaEqual()', () => {
    const document1: serializedNode = {
      type: NodeType.Document,
      compatMode: 'CSS1Compat',
      childNodes: [],
    };
    const document2: serializedNode = {
      type: NodeType.Document,
      compatMode: 'BackCompat',
      childNodes: [],
    };
    const documentType1: serializedNode = {
      type: NodeType.DocumentType,
      name: 'html',
      publicId: '',
      systemId: '',
    };
    const documentType2: serializedNode = {
      type: NodeType.DocumentType,
      name: 'html',
      publicId: '',
      systemId: 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd',
    };
    const text1: serializedNode = {
      type: NodeType.Text,
      textContent: 'Hello World',
    };
    const text2: serializedNode = {
      type: NodeType.Text,
      textContent: 'Hello world',
    };
    const comment1: serializedNode = {
      type: NodeType.Comment,
      textContent: 'Hello World',
    };
    const comment2: serializedNode = {
      type: NodeType.Comment,
      textContent: 'Hello world',
    };
    const element1: serializedNode = {
      type: NodeType.Element,
      tagName: 'div',
      attributes: {
        className: 'test',
      },
      childNodes: [],
    };
    const element2: serializedNode = {
      type: NodeType.Element,
      tagName: 'span',
      attributes: {
        'aria-label': 'Hello World',
      },
      childNodes: [],
    };
    const element3: serializedNode = {
      type: NodeType.Element,
      tagName: 'div',
      attributes: { id: 'test' },
      childNodes: [comment1 as serializedNodeWithId],
    };

    it('should return false if two nodes have different node types', () => {
      expect(
        isNodeMetaEqual(
          undefined as unknown as serializedNode,
          null as unknown as serializedNode,
        ),
      ).toBeFalsy();
      expect(isNodeMetaEqual(document1, element1)).toBeFalsy();
      expect(isNodeMetaEqual(document1, documentType1)).toBeFalsy();
      expect(isNodeMetaEqual(documentType1, element1)).toBeFalsy();
      expect(isNodeMetaEqual(text1, comment1)).toBeFalsy();
      expect(isNodeMetaEqual(text1, element1)).toBeFalsy();
      expect(isNodeMetaEqual(comment1, element1)).toBeFalsy();
    });

    it('should compare meta data of two document nodes', () => {
      expect(
        isNodeMetaEqual(document1, JSON.parse(JSON.stringify(document1))),
      ).toBeTruthy();
      expect(
        isNodeMetaEqual(JSON.parse(JSON.stringify(document2)), document2),
      ).toBeTruthy();
      expect(isNodeMetaEqual(document1, document2)).toBeFalsy();
    });

    it('should compare meta data of two documentType nodes', () => {
      expect(
        isNodeMetaEqual(
          documentType1,
          JSON.parse(JSON.stringify(documentType1)),
        ),
      ).toBeTruthy();
      expect(
        isNodeMetaEqual(
          JSON.parse(JSON.stringify(documentType2)),
          documentType2,
        ),
      ).toBeTruthy();
      expect(isNodeMetaEqual(documentType1, documentType2)).toBeFalsy();
    });

    it('should compare meta data of two text nodes', () => {
      expect(
        isNodeMetaEqual(text1, JSON.parse(JSON.stringify(text1))),
      ).toBeTruthy();
      expect(
        isNodeMetaEqual(JSON.parse(JSON.stringify(text2)), text2),
      ).toBeTruthy();
      expect(isNodeMetaEqual(text1, text2)).toBeFalsy();
    });

    it('should compare meta data of two comment nodes', () => {
      expect(
        isNodeMetaEqual(comment1, JSON.parse(JSON.stringify(comment1))),
      ).toBeTruthy();
      expect(
        isNodeMetaEqual(JSON.parse(JSON.stringify(comment2)), comment2),
      ).toBeTruthy();
      expect(isNodeMetaEqual(comment1, comment2)).toBeFalsy();
    });

    it('should compare meta data of two HTML elements', () => {
      expect(
        isNodeMetaEqual(element1, JSON.parse(JSON.stringify(element1))),
      ).toBeTruthy();
      expect(
        isNodeMetaEqual(JSON.parse(JSON.stringify(element2)), element2),
      ).toBeTruthy();
      expect(
        isNodeMetaEqual(element1, {
          ...element1,
          childNodes: [comment2 as serializedNodeWithId],
        }),
      ).toBeTruthy();
      expect(isNodeMetaEqual(element1, element2)).toBeFalsy();
      expect(isNodeMetaEqual(element1, element3)).toBeFalsy();
      expect(isNodeMetaEqual(element2, element3)).toBeFalsy();
    });
  });

  describe('extractFileExtension', () => {
    test('absolute path', () => {
      const path = 'https://example.com/styles/main.css';
      const extension = extractFileExtension(path);
      expect(extension).toBe('css');
    });

    test('relative path', () => {
      const path = 'styles/main.css';
      const baseURL = 'https://example.com/';
      const extension = extractFileExtension(path, baseURL);
      expect(extension).toBe('css');
    });

    test('path with search parameters', () => {
      const path = 'https://example.com/scripts/app.js?version=1.0';
      const extension = extractFileExtension(path);
      expect(extension).toBe('js');
    });

    test('path with fragment', () => {
      const path = 'https://example.com/styles/main.css#section1';
      const extension = extractFileExtension(path);
      expect(extension).toBe('css');
    });

    test('path with search parameters and fragment', () => {
      const path = 'https://example.com/scripts/app.js?version=1.0#section1';
      const extension = extractFileExtension(path);
      expect(extension).toBe('js');
    });

    test('path without extension', () => {
      const path = 'https://example.com/path/to/directory/';
      const extension = extractFileExtension(path);
      expect(extension).toBeNull();
    });

    test('invalid URL', () => {
      const path = '!@#$%^&*()';
      const baseURL = 'invalid';
      const extension = extractFileExtension(path, baseURL);
      expect(extension).toBeNull();
    });

    test('path with multiple dots', () => {
      const path = 'https://example.com/scripts/app.min.js?version=1.0';
      const extension = extractFileExtension(path);
      expect(extension).toBe('js');
    });
  });

  describe('escapeImportStatement', () => {
    it('parses imports with quotes correctly', () => {
      const out1 = escapeImportStatement({
        cssText: `@import url("/foo.css;900;800"");`,
        href: '/foo.css;900;800"',
        media: {
          length: 0,
        },
        layerName: null,
        supportsText: null,
      } as unknown as CSSImportRule);
      expect(out1).toEqual(`@import url("/foo.css;900;800\\"");`);

      const out2 = escapeImportStatement({
        cssText: `@import url("/foo.css;900;800"") supports(display: flex);`,
        href: '/foo.css;900;800"',
        media: {
          length: 0,
        },
        layerName: null,
        supportsText: 'display: flex',
      } as unknown as CSSImportRule);
      expect(out2).toEqual(
        `@import url("/foo.css;900;800\\"") supports(display: flex);`,
      );

      const out3 = escapeImportStatement({
        cssText: `@import url("/foo.css;900;800"");`,
        href: '/foo.css;900;800"',
        media: {
          length: 1,
          mediaText: 'print, screen',
        },
        layerName: null,
        supportsText: null,
      } as unknown as CSSImportRule);
      expect(out3).toEqual(`@import url("/foo.css;900;800\\"") print, screen;`);

      const out4 = escapeImportStatement({
        cssText: `@import url("/foo.css;900;800"") layer(layer-1);`,
        href: '/foo.css;900;800"',
        media: {
          length: 0,
        },
        layerName: 'layer-1',
        supportsText: null,
      } as unknown as CSSImportRule);
      expect(out4).toEqual(
        `@import url("/foo.css;900;800\\"") layer(layer-1);`,
      );

      const out5 = escapeImportStatement({
        cssText: `@import url("/foo.css;900;800"") layer;`,
        href: '/foo.css;900;800"',
        media: {
          length: 0,
        },
        layerName: '',
        supportsText: null,
      } as unknown as CSSImportRule);
      expect(out5).toEqual(`@import url("/foo.css;900;800\\"") layer;`);
    });
  });
  describe('fixSafariColons', () => {
    it('parses : in attribute selectors correctly', () => {
      const out1 = fixSafariColons('[data-foo] { color: red; }');
      expect(out1).toEqual('[data-foo] { color: red; }');

      const out2 = fixSafariColons('[data-foo:other] { color: red; }');
      expect(out2).toEqual('[data-foo\\:other] { color: red; }');

      const out3 = fixSafariColons('[data-aa\\:other] { color: red; }');
      expect(out3).toEqual('[data-aa\\:other] { color: red; }');
    });
  });

  describe('shouldIgnoreAsset()', () => {
    it(`should ignore assets when config not specified`, () => {
      expect(shouldIgnoreAsset('http://example.com', {})).toBe(true);
    });

    it(`should not ignore matching origin`, () => {
      expect(
        shouldIgnoreAsset('http://example.com/', {
          origins: ['http://example.com'],
        }),
      ).toBe(false);
    });

    it(`should ignore mismatched origin`, () => {
      expect(
        shouldIgnoreAsset('http://123.com/', {
          origins: ['http://example.com'],
        }),
      ).toBe(true);
    });

    it(`should ignore malformed url`, () => {
      expect(
        shouldIgnoreAsset('http:', { origins: ['http://example.com'] }),
      ).toBe(true);
    });

    it(`should ignore malformed url even with origins: true`, () => {
      expect(shouldIgnoreAsset('http:', { origins: true })).toBe(true);
    });
  });

  describe('isAttributeCapturable()', () => {
    const validAttributeCombinations = [
      ['img', ['src', 'srcset']],
      ['video', ['src']],
      ['audio', ['src']],
      ['embed', ['src']],
      ['source', ['src']],
      ['track', ['src']],
      ['input', ['src']],
      ['object', ['src']],
    ] as const;

    const invalidAttributeCombinations = [
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
      ['link', ['href']], // without rel="stylesheet"
    ] as const;

    validAttributeCombinations.forEach(([tagName, attributes]) => {
      const element = document.createElement(tagName);
      attributes.forEach((attribute) => {
        it(`should correctly identify <${tagName} ${attribute}> as capturable`, () => {
          expect(isAttributeCapturable(element, attribute)).toBe(true);
        });
      });
    });

    invalidAttributeCombinations.forEach(([tagName, attributes]) => {
      const element = document.createElement(tagName);
      attributes.forEach((attribute) => {
        it(`should correctly identify <${tagName} ${attribute}> as NOT capturable`, () => {
          expect(isAttributeCapturable(element, attribute)).toBe(false);
        });
      });
    });

    it(`should identify a <source> child of a <picture> element as a capturable image`, () => {
      const picture = document.createElement('picture');
      const source = document.createElement('source');
      source.srcset = 'https://example.com/img1.png';

      // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source
      // "Not allowed if parent is a picture"
      source.src = 'https://example.com/img2.png';

      const fallback_img = document.createElement('img');
      fallback_img.src = 'https://example.com/img3.png';

      picture.append(source);
      picture.append(fallback_img);

      expect(
        shouldCaptureAsset(source, 'srcset', source.srcset, { images: true }),
      ).toBe(true);
      expect(
        shouldCaptureAsset(source, 'src', source.srcset, { images: true }),
      ).toBe(false); // not allowed
      expect(
        shouldCaptureAsset(fallback_img, 'src', source.src, { images: true }),
      ).toBe(true);

      expect(
        shouldCaptureAsset(source, 'srcset', source.srcset, { images: false }),
      ).toBe(false);
      expect(
        shouldCaptureAsset(fallback_img, 'src', source.src, { images: false }),
      ).toBe(false);
    });

    it(`should correctly identify <source> child of a <video> element as capturable if captureAssets.video is true`, () => {
      const video = document.createElement('video');
      const source = document.createElement('source');
      source.src = 'https://example.com/show1.mov';

      // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source
      // "Not allowed if parent is a audio or video"
      source.srcset = 'https://example.com/show2.mov';

      video.append(source);

      expect(
        shouldCaptureAsset(source, 'src', source.src, { video: true }),
      ).toBe(true);
      expect(
        shouldCaptureAsset(source, 'srcset', source.srcset, { video: true }),
      ).toBe(false); // not allowed

      expect(
        shouldCaptureAsset(source, 'src', source.src, { video: false }),
      ).toBe(false); // false because of lack of origins
    });

    it(`should correctly identify <source> child of a <audio> element as capturable if captureAssets.audio is true`, () => {
      const audio = document.createElement('audio');
      const source = document.createElement('source');
      source.src = 'https://example.com/recording1.mp3';

      // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source
      // "Not allowed if parent is a audio or video"
      source.srcset = 'https://example.com/recording2.mp3';

      audio.append(source);

      expect(
        shouldCaptureAsset(source, 'src', source.src, { audio: true }),
      ).toBe(true);
      expect(
        shouldCaptureAsset(source, 'srcset', source.srcset, { audio: true }),
      ).toBe(false); // not allowed

      expect(
        shouldCaptureAsset(source, 'src', source.src, { audio: false }),
      ).toBe(false);
    });

    it(`should correctly identify <link href rel="stylesheet"> as capturable if inlineStylesheet == 'all'`, () => {
      const element = document.createElement('link');
      element.setAttribute('rel', 'StyleSheet');

      // pretend it has loaded but isn't CORS accessible
      Object.defineProperty(element, 'sheet', {
        value: true,
      });

      const ca = {
        objectURLs: false,
        origins: false,
      };
      expect(
        shouldCaptureAsset(element, 'href', 'https://example.com/style.css', {
          ...ca,
          stylesheets: false,
        }),
      ).toBe(false);
      expect(
        shouldCaptureAsset(element, 'href', 'https://example.com/style.css', {
          ...ca,
          stylesheets: 'without-fetch',
        }),
      ).toBe(false); // this is false for backwards compatibility
      expect(
        shouldCaptureAsset(element, 'href', 'https://example.com/style.css', {
          ...ca,
          stylesheets: true,
        }),
      ).toBe(true);
    });

    it(`should not identify <link href rel="stylesheet"> as capturable if it hasn't loaded yet`, () => {
      const element = document.createElement('link');
      element.setAttribute('rel', 'StyleSheet');
      expect(
        shouldCaptureAsset(element, 'href', 'https://example.com/style.css', {
          objectURLs: false,
          origins: false,
          stylesheets: true,
        }),
      ).toBe(false); // will capture as mutation when it loads
    });

    it(`should correctly identify stylesheet as capturable due to origin match, but respect a hard stylesheets=false`, () => {
      const element = document.createElement('link');
      element.setAttribute('rel', 'StyleSheet');

      // pretend it has loaded but isn't CORS accessible
      Object.defineProperty(element, 'sheet', {
        value: true,
      });

      const ca = {
        objectURLs: false,
        origins: ['https://example.com'],
      };
      expect(
        shouldCaptureAsset(
          element,
          'href',
          'https://example.com/style.css',
          ca, // stylesheets undefined (not actually possible from rrweb)
        ),
      ).toBe(true);
      expect(
        shouldCaptureAsset(element, 'href', 'https://example.com/style.css', {
          ...ca,
          stylesheets: 'without-fetch', // the default from rrweb
        }),
      ).toBe(true); // because of origins
      expect(
        shouldCaptureAsset(element, 'href', 'https://example.com/style.css', {
          ...ca,
          stylesheets: false, // explicit off, override origins
        }),
      ).toBe(false);
    });
  });
});
