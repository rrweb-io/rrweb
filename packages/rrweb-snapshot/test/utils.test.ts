/**
 * @vitest-environment jsdom
 */
import { describe, it, test, expect } from 'vitest';
import {
  escapeImportStatement,
  extractFileExtension,
  fixSafariColons,
  isNodeMetaEqual,
  Mirror,
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

  describe('Mirror', () => {
    describe('removeNodeFromMap with permanent flag', () => {
      it('should remove node from both idNodeMap and nodeMetaMap', () => {
        const mirror = new Mirror();
        const div = document.createElement('div');
        const meta = {
          type: NodeType.Element,
          tagName: 'div',
          attributes: {},
          childNodes: [],
          id: 1,
        } as serializedNodeWithId;

        mirror.add(div, meta);
        expect(mirror.getId(div)).toBe(1);
        expect(mirror.hasNode(div)).toBe(true);
        expect(mirror.getNode(1)).toBe(div);

        mirror.removeNodeFromMap(div, true);

        expect(mirror.getId(div)).toBe(-1);
        expect(mirror.hasNode(div)).toBe(false);
        expect(mirror.getNode(1)).toBeNull();
      });

      it('should recursively remove child nodes', () => {
        const mirror = new Mirror();

        const parent = document.createElement('div');
        const child1 = document.createElement('span');
        const child2 = document.createElement('p');
        const grandchild = document.createElement('a');

        parent.appendChild(child1);
        parent.appendChild(child2);
        child1.appendChild(grandchild);

        const parentMeta = {
          type: NodeType.Element,
          tagName: 'div',
          attributes: {},
          childNodes: [],
          id: 1,
        } as serializedNodeWithId;
        const child1Meta = {
          type: NodeType.Element,
          tagName: 'span',
          attributes: {},
          childNodes: [],
          id: 2,
        } as serializedNodeWithId;
        const child2Meta = {
          type: NodeType.Element,
          tagName: 'p',
          attributes: {},
          childNodes: [],
          id: 3,
        } as serializedNodeWithId;
        const grandchildMeta = {
          type: NodeType.Element,
          tagName: 'a',
          attributes: {},
          childNodes: [],
          id: 4,
        } as serializedNodeWithId;

        mirror.add(parent, parentMeta);
        mirror.add(child1, child1Meta);
        mirror.add(child2, child2Meta);
        mirror.add(grandchild, grandchildMeta);

        expect(mirror.hasNode(parent)).toBe(true);
        expect(mirror.hasNode(child1)).toBe(true);
        expect(mirror.hasNode(child2)).toBe(true);
        expect(mirror.hasNode(grandchild)).toBe(true);

        mirror.removeNodeFromMap(parent, true);

        expect(mirror.hasNode(parent)).toBe(false);
        expect(mirror.hasNode(child1)).toBe(false);
        expect(mirror.hasNode(child2)).toBe(false);
        expect(mirror.hasNode(grandchild)).toBe(false);
        expect(mirror.getId(parent)).toBe(-1);
        expect(mirror.getId(child1)).toBe(-1);
        expect(mirror.getId(child2)).toBe(-1);
        expect(mirror.getId(grandchild)).toBe(-1);
      });

      it('should differ from non-permanent removeNodeFromMap by also clearing nodeMetaMap', () => {
        const mirror1 = new Mirror();
        const div1 = document.createElement('div');
        const meta1 = {
          type: NodeType.Element,
          tagName: 'div',
          attributes: {},
          childNodes: [],
          id: 1,
        } as serializedNodeWithId;

        mirror1.add(div1, meta1);
        mirror1.removeNodeFromMap(div1);

        // removeNodeFromMap only clears idNodeMap, not nodeMetaMap
        expect(mirror1.getNode(1)).toBeNull();
        expect(mirror1.hasNode(div1)).toBe(true); // Still in nodeMetaMap

        const mirror2 = new Mirror();
        const div2 = document.createElement('div');
        const meta2 = {
          type: NodeType.Element,
          tagName: 'div',
          attributes: {},
          childNodes: [],
          id: 1,
        } as serializedNodeWithId;

        mirror2.add(div2, meta2);
        mirror2.removeNodeFromMap(div2, true);

        // removeNodeFromMap with permanent=true clears both maps
        expect(mirror2.getNode(1)).toBeNull();
        expect(mirror2.hasNode(div2)).toBe(false); // Also removed from nodeMetaMap
      });
    });
  });
});
