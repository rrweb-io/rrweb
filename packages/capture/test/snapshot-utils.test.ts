/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { NodeType } from '@amplitude/rrweb-types';
import type { serializedNodeWithId } from '@amplitude/rrweb-types';
import {
  hasChildNodes,
  serializeAdoptedStyleSheets,
  injectAdoptedStyles,
  injectDocumentAdoptedStyles,
  injectAllAdoptedStyles,
  findMaxId,
  getNextIdFromMirror,
} from '../src/snapshot-utils';

function makeElementNode(
  id: number,
  tagName: string,
  childNodes: serializedNodeWithId[] = [],
  extra: Record<string, unknown> = {},
): serializedNodeWithId {
  return {
    type: NodeType.Element,
    tagName,
    attributes: {},
    childNodes,
    id,
    ...extra,
  } as unknown as serializedNodeWithId;
}

function makeDocumentNode(
  id: number,
  childNodes: serializedNodeWithId[] = [],
): serializedNodeWithId {
  return {
    type: NodeType.Document,
    childNodes,
    id,
  } as unknown as serializedNodeWithId;
}

function makeTextNode(id: number): serializedNodeWithId {
  return {
    type: NodeType.Text,
    textContent: 'hello',
    id,
  } as unknown as serializedNodeWithId;
}

describe('hasChildNodes', () => {
  it('returns true for Document nodes', () => {
    const node = makeDocumentNode(1);
    expect(hasChildNodes(node)).toBe(true);
  });

  it('returns true for Element nodes', () => {
    const node = makeElementNode(1, 'div');
    expect(hasChildNodes(node)).toBe(true);
  });

  it('returns false for Text nodes', () => {
    const node = makeTextNode(1);
    expect(hasChildNodes(node)).toBe(false);
  });
});

describe('findMaxId', () => {
  it('returns the id of a single node', () => {
    const node = makeTextNode(5);
    expect(findMaxId(node)).toBe(5);
  });

  it('finds the max id in a nested tree', () => {
    const tree = makeDocumentNode(1, [
      makeElementNode(2, 'html', [
        makeElementNode(3, 'head'),
        makeElementNode(4, 'body', [
          makeElementNode(10, 'div', [makeTextNode(7)]),
        ]),
      ]),
    ]);
    expect(findMaxId(tree)).toBe(10);
  });

  it('handles a flat list of children', () => {
    const tree = makeElementNode(1, 'div', [
      makeTextNode(3),
      makeTextNode(2),
      makeTextNode(8),
      makeTextNode(5),
    ]);
    expect(findMaxId(tree)).toBe(8);
  });
});

describe('getNextIdFromMirror', () => {
  it('returns max ID + 1 from the mirror', () => {
    const mirror = { getIds: () => [1, 5, 3, 10, 7] } as any;
    expect(getNextIdFromMirror(mirror)).toBe(11);
  });

  it('returns 1 when mirror has no IDs', () => {
    const mirror = { getIds: () => [] } as any;
    expect(getNextIdFromMirror(mirror)).toBe(1);
  });

  it('handles a single ID', () => {
    const mirror = { getIds: () => [42] } as any;
    expect(getNextIdFromMirror(mirror)).toBe(43);
  });
});

describe('serializeAdoptedStyleSheets', () => {
  it('returns null when there are no adopted stylesheets', () => {
    expect(serializeAdoptedStyleSheets(document)).toBeNull();
  });

  it('serializes adopted stylesheets into a CSS string', () => {
    const sheet = new CSSStyleSheet();
    sheet.insertRule('body { color: red; }');
    sheet.insertRule('.foo { margin: 0; }');
    document.adoptedStyleSheets = [sheet];

    const result = serializeAdoptedStyleSheets(document);
    expect(result).toContain('body');
    expect(result).toContain('color: red');
    expect(result).toContain('.foo');

    document.adoptedStyleSheets = [];
  });

  it('returns null when all sheets throw (cross-origin)', () => {
    const fakeSheet = {
      get cssRules() {
        throw new DOMException('cross-origin');
      },
    } as unknown as CSSStyleSheet;

    const fakeRoot = {
      adoptedStyleSheets: [fakeSheet],
    } as unknown as Document;

    expect(serializeAdoptedStyleSheets(fakeRoot)).toBeNull();
  });
});

describe('injectDocumentAdoptedStyles', () => {
  it('does nothing when document has no adopted stylesheets', () => {
    document.adoptedStyleSheets = [];

    const head = makeElementNode(3, 'head', []);
    const snap = makeDocumentNode(1, [makeElementNode(2, 'html', [head])]);
    const nextId = { value: 10 };

    injectDocumentAdoptedStyles(snap, nextId);

    expect((head as any).childNodes).toHaveLength(0);
    expect(nextId.value).toBe(10);
  });

  it('injects a style node into head when document has adopted stylesheets', () => {
    const sheet = new CSSStyleSheet();
    sheet.insertRule('body { background: blue; }');
    document.adoptedStyleSheets = [sheet];

    const head = makeElementNode(3, 'head', []);
    const snap = makeDocumentNode(1, [makeElementNode(2, 'html', [head])]);
    const nextId = { value: 10 };

    injectDocumentAdoptedStyles(snap, nextId);

    const headChildren = (head as any).childNodes;
    expect(headChildren).toHaveLength(1);
    expect(headChildren[0].tagName).toBe('style');
    expect(headChildren[0].attributes._cssText).toContain('background: blue');
    expect(headChildren[0].id).toBe(10);
    expect(nextId.value).toBe(11);

    document.adoptedStyleSheets = [];
  });

  it('does nothing when snap has no html or head element', () => {
    const sheet = new CSSStyleSheet();
    sheet.insertRule('body { color: red; }');
    document.adoptedStyleSheets = [sheet];

    const snap = makeDocumentNode(1, [makeElementNode(2, 'div')]);
    const nextId = { value: 10 };

    injectDocumentAdoptedStyles(snap, nextId);
    expect(nextId.value).toBe(10);

    document.adoptedStyleSheets = [];
  });
});

describe('injectAdoptedStyles', () => {
  it('does nothing for non-shadow-host elements', () => {
    const node = makeElementNode(1, 'div', [makeElementNode(2, 'span')]);
    const mirror = { getNode: vi.fn() } as any;
    const nextId = { value: 10 };

    injectAdoptedStyles(node, mirror, nextId);

    expect(mirror.getNode).not.toHaveBeenCalled();
    expect(nextId.value).toBe(10);
  });

  it('injects styles for shadow host elements with adopted stylesheets', () => {
    const sheet = new CSSStyleSheet();
    sheet.insertRule(':host { display: block; }');

    const fakeShadowRoot = {
      adoptedStyleSheets: [sheet],
    } as unknown as ShadowRoot;

    const fakeDomNode = {
      shadowRoot: fakeShadowRoot,
    } as unknown as Element;

    const mirror = {
      getNode: vi.fn().mockReturnValue(fakeDomNode),
    } as any;

    const childNode = makeElementNode(3, 'span');
    const node = makeElementNode(1, 'div', [childNode], {
      isShadowHost: true,
    });
    const nextId = { value: 10 };

    injectAdoptedStyles(node, mirror, nextId);

    expect(mirror.getNode).toHaveBeenCalledWith(1);
    const children = (node as any).childNodes;
    expect(children[0].tagName).toBe('style');
    expect(children[0].attributes._cssText).toContain('display: block');
    expect(children[0].isShadow).toBe(true);
    expect(children[0].id).toBe(10);
    expect(nextId.value).toBe(11);
    expect(children[1]).toBe(childNode);
  });

  it('recurses into nested children', () => {
    const mirror = { getNode: vi.fn().mockReturnValue(null) } as any;

    const innerHost = makeElementNode(3, 'div', [], { isShadowHost: true });
    const node = makeElementNode(1, 'div', [
      makeElementNode(2, 'div', [innerHost]),
    ]);
    const nextId = { value: 10 };

    injectAdoptedStyles(node, mirror, nextId);

    expect(mirror.getNode).toHaveBeenCalledWith(3);
  });
});

describe('injectAllAdoptedStyles', () => {
  it('injects both document-level and shadow DOM styles in a single walk', () => {
    // Set up document-level adopted stylesheet
    const docSheet = new CSSStyleSheet();
    docSheet.insertRule('body { font-size: 16px; }');
    document.adoptedStyleSheets = [docSheet];

    // Set up shadow host with its own adopted stylesheet
    const shadowSheet = new CSSStyleSheet();
    shadowSheet.insertRule(':host { color: green; }');

    const fakeShadowRoot = {
      adoptedStyleSheets: [shadowSheet],
    } as unknown as ShadowRoot;

    const fakeDomNode = {
      shadowRoot: fakeShadowRoot,
    } as unknown as Element;

    const mirror = {
      getNode: vi.fn().mockReturnValue(fakeDomNode),
    } as any;

    const shadowChild = makeElementNode(6, 'span');
    const shadowHost = makeElementNode(5, 'div', [shadowChild], {
      isShadowHost: true,
    });

    const head = makeElementNode(3, 'head', []);
    const body = makeElementNode(4, 'body', [shadowHost]);
    const snap = makeDocumentNode(1, [
      makeElementNode(2, 'html', [head, body]),
    ]);
    const nextId = { value: 10 };

    injectAllAdoptedStyles(snap, mirror, nextId);

    // Document-level style should be in head
    const headChildren = (head as any).childNodes;
    expect(headChildren).toHaveLength(1);
    expect(headChildren[0].tagName).toBe('style');
    expect(headChildren[0].attributes._cssText).toContain('font-size: 16px');

    // Shadow DOM style should be first child of shadow host
    const hostChildren = (shadowHost as any).childNodes;
    expect(hostChildren[0].tagName).toBe('style');
    expect(hostChildren[0].attributes._cssText).toContain('color: green');
    expect(hostChildren[0].isShadow).toBe(true);
    // Original child still present
    expect(hostChildren[1]).toBe(shadowChild);

    // Two style nodes injected total
    expect(nextId.value).toBe(12);

    document.adoptedStyleSheets = [];
  });

  it('works when there are no adopted stylesheets at all', () => {
    document.adoptedStyleSheets = [];
    const mirror = { getNode: vi.fn() } as any;

    const head = makeElementNode(3, 'head', []);
    const snap = makeDocumentNode(1, [makeElementNode(2, 'html', [head])]);
    const nextId = { value: 10 };

    injectAllAdoptedStyles(snap, mirror, nextId);

    expect((head as any).childNodes).toHaveLength(0);
    expect(nextId.value).toBe(10);
  });
});
