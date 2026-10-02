/**
 * @vitest-environment jsdom
 */
import { describe, it, test, expect } from 'vitest';
import {
  escapeImportStatement,
  extractFileExtension,
  replaceChromeGridTemplateAreas,
  fixSafariColons,
  isNodeMetaEqual,
  stringifyStylesheet,
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

  describe('replaceChromeGridTemplateAreas', () => {
    it('does not alter corectly parsed grid template rules', () => {
      const cssText =
        '#wrapper { display: grid; width: 100%; height: 100%; grid-template: minmax(2, 1fr); margin: 0px auto; }';
      const mockCssRule = {
        cssText,
        selectorText: '#wrapper',
        style: {
          getPropertyValue(prop) {
            return {
              'grid-template-areas': '',
            }[prop];
          },
        },
      } as Partial<CSSStyleRule> as CSSStyleRule;

      expect(replaceChromeGridTemplateAreas(mockCssRule)).toEqual(cssText);
    });

    it('fixes incorrectly parsed grid template rules', () => {
      const cssText1 =
        '#wrapper { grid-template-areas: "header header" "main main" "footer footer"; grid-template-rows: minmax(2, 1fr); grid-template-columns: minmax(2, 1fr); display: grid; margin: 0px auto; }';
      const cssText2 =
        '.some-class { color: purple; grid-template: "TopNav TopNav" 65px "SideNav Content" 52px "SideNav Content" / 255px auto; column-gap: 32px; }';

      const mockCssRule1 = {
        cssText: cssText1,
        selectorText: '#wrapper',
        style: {
          length: 5,
          0: 'grid-template-areas',
          1: 'grid-template-rows',
          2: 'grid-template-columns',
          3: 'display',
          4: 'margin',
          getPropertyValue: (key: string): string => {
            switch (key) {
              case 'grid-template-areas':
                return '"header header" "main main" "footer footer"';
              case 'grid-template-rows':
                return 'minmax(2, 1fr)';
              case 'grid-template-columns':
                return 'minmax(2, 1fr)';
              case 'display':
                return 'grid';
              case 'margin':
                return '0px auto';
              default:
                return '';
            }
          },
        } as Record<string | number, any>,
      } as Partial<CSSStyleRule> as CSSStyleRule;

      const mockCssRule2 = {
        cssText: cssText2,
        selectorText: '.some-class',
        style: {
          length: 5,
          0: 'color',
          1: 'grid-template-areas',
          2: 'grid-template-rows',
          3: 'grid-template-columns',
          4: 'column-gap',
          getPropertyValue: (key: string): string => {
            switch (key) {
              case 'color':
                return 'purple';
              case 'grid-template-areas':
                return '"TopNav TopNav" "SideNav Content" "SideNav Content"';
              case 'grid-template-rows':
                return '65px 52px auto';
              case 'grid-template-columns':
                return '255px auto';
              case 'column-gap':
                return '32px';
              default:
                return '';
            }
          },
        } as Record<string | number, any>,
      } as Partial<CSSStyleRule> as CSSStyleRule;

      expect(replaceChromeGridTemplateAreas(mockCssRule1)).toEqual(
        '#wrapper { grid-template-areas: "header header" "main main" "footer footer"; grid-template-rows: minmax(2, 1fr); grid-template-columns: minmax(2, 1fr); display: grid; margin: 0px auto; }',
      );
      expect(replaceChromeGridTemplateAreas(mockCssRule2)).toEqual(
        '.some-class { color: purple; grid-template-areas: "TopNav TopNav" "SideNav Content" "SideNav Content"; grid-template-rows: 65px 52px auto; grid-template-columns: 255px auto; column-gap: 32px; }',
      );
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

  describe('stringifyStylesheet', () => {
    it('returns null if rules are missing', () => {
      const mockSheet = {
        rules: null,
        cssRules: null,
      } as unknown as CSSStyleSheet;
      expect(stringifyStylesheet(mockSheet)).toBeNull();
    });

    it('stringifies rules using .cssRules if .rules is missing', () => {
      const mockRule1 = { cssText: 'div { margin: 0; }' } as CSSRule;
      const mockSheet = {
        cssRules: [mockRule1],
        href: 'https://example.com/main.css',
      } as unknown as CSSStyleSheet;
      expect(stringifyStylesheet(mockSheet)).toBe('div { margin: 0; }');
    });

    it('uses ownerNode.baseURI for inline styles', () => {
      const mockFontFaceRule = {
        cssText: `
          @font-face {
            font-family: 'MockFont';
            src: url('../fonts/mockfont.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
          }
        `,
      } as CSSRule;
      const mockOwnerNode = {
        baseURI: 'https://example.com/fonts/',
      } as unknown as Node;
      const mockSheet = {
        cssRules: [mockFontFaceRule],
        href: null,
        ownerNode: mockOwnerNode,
      } as unknown as CSSStyleSheet;
      expect(
        stringifyStylesheet(mockSheet)?.replace(/\s+/g, ' ').trim(),
      ).toEqual(
        "@font-face { font-family: 'MockFont'; src: url('https://example.com/fonts/mockfont.woff2') format('woff2'); font-weight: normal; font-style: normal; }",
      );
    });
  });
});
