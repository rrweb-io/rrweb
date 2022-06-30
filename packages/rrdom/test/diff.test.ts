/**
 * @jest-environment jsdom
 */
import { getDefaultSN, RRDocument, RRMediaElement } from '../src';
import {
  applyVirtualStyleRulesToNode,
  createOrGetNode,
  diff,
  ReplayerHandler,
  StyleRuleType,
  VirtualStyleRules,
} from '../src/diff';
import {
  NodeType as RRNodeType,
  serializedNodeWithId,
  createMirror,
  Mirror,
} from 'rrweb-snapshot';
import type { IRRNode } from '../src/document';
import {
  canvasMutationData,
  EventType,
  IncrementalSource,
} from 'rrweb/src/types';

const elementSn = {
  type: RRNodeType.Element,
  tagName: 'DIV',
  attributes: {},
  childNodes: [],
  id: 1,
} as serializedNodeWithId;

type ElementType = {
  tagName: keyof HTMLElementTagNameMap;
  id: number;
  children?: ElementType[];
};

type RRNode = IRRNode;

/**
 * Create a document tree or a RRDom tree according to the given ElementType data.
 *
 * @param treeNode the given data structure
 * @param rrDocument determine to generate a RRDom tree.
 * @param mirror determine to generate the Dom tree.
 */
function createTree(
  treeNode: ElementType,
  rrDocument?: RRDocument,
  mirror: Mirror = createMirror(),
): Node | RRNode {
  type TNode = typeof rrDocument extends RRDocument ? RRNode : Node;
  let root: TNode;

  root = (rrDocument
    ? rrDocument.createElement(treeNode.tagName)
    : document.createElement(treeNode.tagName)) as TNode;

  const sn = Object.assign({}, elementSn, {
    tagName: treeNode.tagName,
    id: treeNode.id,
  });

  if (rrDocument) {
    rrDocument.mirror.add((root as unknown) as RRNode, sn);
  } else {
    mirror.add((root as unknown) as Node, sn);
  }

  if (treeNode.children)
    for (let child of treeNode.children) {
      const childNode = createTree(child, rrDocument, mirror) as TNode;
      if (rrDocument) root.appendChild(childNode);
      else root.appendChild(childNode);
    }
  return root;
}

function shuffle(list: number[]) {
  let currentIndex = list.length - 1;
  while (currentIndex > 0) {
    const randomIndex = Math.floor(Math.random() * (currentIndex - 1));
    const temp = list[randomIndex];
    list[randomIndex] = list[currentIndex];
    list[currentIndex] = temp;
    currentIndex--;
  }
  return list;
}

describe('diff algorithm for rrdom', () => {
  let mirror: Mirror;
  let replayer: ReplayerHandler;

  beforeEach(() => {
    mirror = createMirror();
    replayer = {
      mirror,
      applyCanvas: () => {},
      applyInput: () => {},
      applyScroll: () => {},
    };
  });

  describe('diff single node', () => {
    it('should diff a document node', () => {
      document.close();
      document.open();
      expect(document.childNodes.length).toEqual(0);
      const rrNode = new RRDocument();
      const htmlContent =
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">';
      rrNode.write(htmlContent);
      // add scroll data for the document
      rrNode.scrollData = {
        source: IncrementalSource.Scroll,
        id: 0,
        x: 0,
        y: 0,
      };
      replayer.applyScroll = jest.fn();
      diff(document, rrNode, replayer);
      expect(document.childNodes.length).toEqual(1);
      expect(document.childNodes[0]).toBeInstanceOf(DocumentType);
      expect(document.doctype?.name).toEqual('html');
      expect(document.doctype?.publicId).toEqual(
        '-//W3C//DTD XHTML 1.0 Transitional//EN',
      );
      expect(document.doctype?.systemId).toEqual('');
      expect(replayer.applyScroll).toBeCalledTimes(1);
    });

    it('should apply input data on an input element', () => {
      const element = document.createElement('input');
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement('input');
      rrNode.inputData = {
        source: IncrementalSource.Input,
        text: '',
        id: 0,
        isChecked: false,
      };
      replayer.applyInput = jest.fn();
      diff(element, rrNode, replayer);
      expect(replayer.applyInput).toHaveBeenCalledTimes(1);
    });

    it('should diff a Text node', () => {
      const node = document.createTextNode('old text');
      expect(node.textContent).toEqual('old text');
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createTextNode('new text');
      diff(node, rrNode, replayer);
      expect(node.textContent).toEqual('new text');
    });

    it('should diff a style element', () => {
      document.write('<html></html>');
      const element = document.createElement('style');
      document.documentElement.appendChild(element);
      const rrDocument = new RRDocument();
      const rrStyle = rrDocument.createElement('style');
      rrStyle.rules = [
        { cssText: 'div{color: black;}', type: StyleRuleType.Insert, index: 0 },
      ];
      diff(element, rrStyle, replayer);
      expect(element.sheet!.cssRules.length).toEqual(1);
      expect(element.sheet!.cssRules[0].cssText).toEqual('div {color: black;}');
    });

    it('should diff a canvas element', () => {
      const element = document.createElement('canvas');
      const rrDocument = new RRDocument();
      const rrCanvas = rrDocument.createElement('canvas');
      const canvasMutation = {
        source: IncrementalSource.CanvasMutation,
        id: 0,
        type: 0,
        commands: [{ property: 'fillStyle', args: [{}], setter: true }],
      } as canvasMutationData;
      const MutationNumber = 100;
      Array.from(Array(MutationNumber)).forEach(() =>
        rrCanvas.canvasMutations.push({
          event: {
            timestamp: Date.now(),
            type: EventType.IncrementalSnapshot,
            data: canvasMutation,
          },
          mutation: canvasMutation,
        }),
      );
      replayer.applyCanvas = jest.fn();
      diff(element, rrCanvas, replayer);
      expect(replayer.applyCanvas).toHaveBeenCalledTimes(MutationNumber);
    });

    it('should diff a media element', async () => {
      // mock the HTMLMediaElement of jsdom
      let paused = true;
      window.HTMLMediaElement.prototype.play = async () => {
        paused = false;
      };
      window.HTMLMediaElement.prototype.pause = async () => {
        paused = true;
      };
      Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
        get() {
          return paused;
        },
      });

      for (const tagName of ['AUDIO', 'VIDEO']) {
        const element = document.createElement(tagName) as HTMLMediaElement;
        expect(element.volume).toEqual(1);
        expect(element.currentTime).toEqual(0);
        expect(element.muted).toEqual(false);
        expect(element.paused).toEqual(true);

        const rrDocument = new RRDocument();
        const rrMedia = rrDocument.createElement(tagName) as RRMediaElement;
        rrMedia.volume = 0.5;
        rrMedia.currentTime = 100;
        rrMedia.muted = true;
        rrMedia.paused = false;

        diff(element, rrMedia, replayer);
        expect(element.volume).toEqual(0.5);
        expect(element.currentTime).toEqual(100);
        expect(element.muted).toEqual(true);
        expect(element.paused).toEqual(false);

        rrMedia.paused = true;
        diff(element, rrMedia, replayer);
        expect(element.paused).toEqual(true);
      }
    });
  });

  describe('diff properties', () => {
    it('can add new properties', () => {
      const tagName = 'DIV';
      const node = document.createElement(tagName);
      const sn = Object.assign({}, elementSn, { tagName });
      mirror.add(node, sn);

      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      const sn2 = Object.assign({}, elementSn, { tagName });
      rrDocument.mirror.add(rrNode, sn2);

      rrNode.attributes = { id: 'node1', class: 'node' };
      diff(node, rrNode, replayer);
      expect(((node as Node) as HTMLElement).id).toBe('node1');
      expect(((node as Node) as HTMLElement).className).toBe('node');
    });

    it('can update exist properties', () => {
      const tagName = 'DIV';
      const node = document.createElement(tagName);
      const sn = Object.assign({}, elementSn, { tagName });
      mirror.add(node, sn);

      ((node as Node) as HTMLElement).id = 'element1';
      ((node as Node) as HTMLElement).className = 'element';
      ((node as Node) as HTMLElement).setAttribute('style', 'color: black');
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      const sn2 = Object.assign({}, elementSn, { tagName });
      rrDocument.mirror.add(rrNode, sn2);

      rrNode.attributes = { id: 'node1', class: 'node', style: 'color: white' };
      diff(node, rrNode, replayer);
      expect(((node as Node) as HTMLElement).id).toBe('node1');
      expect(((node as Node) as HTMLElement).className).toBe('node');
      expect(((node as Node) as HTMLElement).getAttribute('style')).toBe(
        'color: white',
      );

      rrNode.attributes = { id: 'node2' };
      diff(node, rrNode, replayer);
      expect(((node as Node) as HTMLElement).id).toBe('node2');
      expect(((node as Node) as HTMLElement).className).toBe('');
      expect(((node as Node) as HTMLElement).getAttribute('style')).toBe(null);
    });

    it('can delete old properties', () => {
      const tagName = 'DIV';
      const node = document.createElement(tagName);
      const sn = Object.assign({}, elementSn, { tagName });
      mirror.add(node, sn);

      ((node as Node) as HTMLElement).id = 'element1';
      ((node as Node) as HTMLElement).className = 'element';
      ((node as Node) as HTMLElement).setAttribute('style', 'color: black');
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      const sn2 = Object.assign({}, elementSn, { tagName });
      rrDocument.mirror.add(rrNode, sn2);

      rrNode.attributes = { id: 'node1' };
      diff(node, rrNode, replayer);
      expect(((node as Node) as HTMLElement).id).toBe('node1');
      expect(((node as Node) as HTMLElement).className).toBe('');
      expect(((node as Node) as HTMLElement).getAttribute('style')).toBe(null);

      rrNode.attributes = { src: 'link' };
      diff(node, rrNode, replayer);
      expect(((node as Node) as HTMLElement).id).toBe('');
      expect(((node as Node) as HTMLElement).className).toBe('');
      expect(((node as Node) as HTMLElement).getAttribute('src')).toBe('link');
    });

    it('can diff scroll positions', () => {
      const tagName = 'DIV';
      const node = document.createElement(tagName);
      const sn = Object.assign({}, elementSn, { tagName });
      mirror.add(node, sn);

      expect(((node as Node) as HTMLElement).scrollLeft).toEqual(0);
      expect(((node as Node) as HTMLElement).scrollTop).toEqual(0);
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      const sn2 = Object.assign({}, elementSn, { tagName });
      rrDocument.mirror.add(rrNode, sn2);

      rrNode.scrollLeft = 100;
      rrNode.scrollTop = 200;
      diff(node, rrNode, replayer);
      expect(((node as Node) as HTMLElement).scrollLeft).toEqual(100);
      expect(((node as Node) as HTMLElement).scrollTop).toEqual(200);
    });

    it('can diff properties for SVG elements', () => {
      const element = document.createElement('svg');
      const rrDocument = new RRDocument();
      const node = rrDocument.createElement('svg');
      const sn = Object.assign({}, elementSn, { tagName: 'svg', isSVG: true });
      rrDocument.mirror.add(node, sn);

      const value = 'http://www.w3.org/2000/svg';
      node.attributes.xmlns = value;

      jest.spyOn(Element.prototype, 'setAttributeNS');
      diff(element, node, replayer);
      expect(((element as Node) as SVGElement).getAttribute('xmlns')).toBe(
        value,
      );
      expect(SVGElement.prototype.setAttributeNS).toHaveBeenCalledWith(
        'http://www.w3.org/2000/xmlns/',
        'xmlns',
        value,
      );
      jest.restoreAllMocks();
    });

    it('can diff properties for canvas', async () => {
      const element = document.createElement('canvas');
      const rrDocument = new RRDocument();
      const rrCanvas = rrDocument.createElement('canvas');
      const sn = Object.assign({}, elementSn, { tagName: 'canvas' });
      rrDocument.mirror.add(rrCanvas, sn);
      rrCanvas.attributes['rr_dataURL'] = 'data:image/png;base64,';

      jest.spyOn(document, 'createElement');

      diff(element, rrCanvas, replayer);
      expect(document.createElement).toHaveBeenCalledWith('img');
      jest.restoreAllMocks();
    });
  });

  describe('diff children', () => {
    it('append elements', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(1);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(3);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
      ]);
    });

    it('prepends elements', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(2);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(5);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
        4,
        5,
      ]);
    });

    it('add elements in the middle', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(4);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(5);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
        4,
        5,
      ]);
    });

    it('add elements at begin and end', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [2, 3, 4].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(3);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(5);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
        4,
        5,
      ]);
    });

    it('add children to parent with no children', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(0);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(3);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
      ]);
    });

    it('remove all children from parent', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(4);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(0);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(0);
      expect(rrNode.childNodes.length).toEqual(0);
    });

    it('remove elements from the beginning', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(5);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
        4,
        5,
      ]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(3);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        3,
        4,
        5,
      ]);
    });

    it('remove elements from end', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(5);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
        4,
        5,
      ]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(3);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
      ]);
    });

    it('remove elements from the middle', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(5);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
        4,
        5,
      ]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(4);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(4);
      expect(rrNode.childNodes.length).toEqual(4);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        4,
        5,
      ]);
    });

    it('moves element forward', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(5);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
        4,
        5,
      ]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [2, 3, 4, 1, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(5);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        2,
        3,
        4,
        1,
        5,
      ]);
    });

    it('move elements to end', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(3);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        2,
        3,
      ]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [2, 3, 1].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(3);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        2,
        3,
        1,
      ]);
    });

    it('move element backwards', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(4);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 4, 2, 3].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(4);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(4);
      expect(rrNode.childNodes.length).toEqual(4);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        1,
        4,
        2,
        3,
      ]);
    });

    it('swap first and last', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(4);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [4, 2, 3, 1].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(4);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(4);
      expect(rrNode.childNodes.length).toEqual(4);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        4,
        2,
        3,
        1,
      ]);
    });

    it('move to left and replace', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(5);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [4, 1, 2, 3, 6].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(5);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        4,
        1,
        2,
        3,
        6,
      ]);
    });

    it('move to left and leaves hold', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(3);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [4, 6].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(2);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(2);
      expect(rrNode.childNodes.length).toEqual(2);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        4,
        6,
      ]);
    });

    it('reverse elements', () => {
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3, 4, 5, 6, 7, 8].map((c) => ({
            tagName: 'span',
            id: c,
          })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(8);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [8, 7, 6, 5, 4, 3, 2, 1].map((c) => ({
            tagName: 'span',
            id: c,
          })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(8);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(8);
      expect(rrNode.childNodes.length).toEqual(8);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual([
        8,
        7,
        6,
        5,
        4,
        3,
        2,
        1,
      ]);
    });

    it('handle random shuffle 1', () => {
      /* Number of elements remains the same and no element will be added or removed. */
      let oldElementsNum = 15,
        newElementsNum = 15;
      let oldElementsIds = [],
        newElementsIds = [];
      for (let i = 1; i <= oldElementsNum; i++) {
        oldElementsIds.push(i);
        newElementsIds.push(i);
      }
      shuffle(oldElementsIds);
      shuffle(newElementsIds);
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: oldElementsIds.map((c) => ({
            tagName: 'span',
            id: c,
          })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(oldElementsNum);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: newElementsIds.map((c) => ({
            tagName: 'span',
            id: c,
          })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(newElementsNum);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(newElementsNum);
      expect(rrNode.childNodes.length).toEqual(newElementsNum);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual(
        newElementsIds,
      );
    });

    it('handle random shuffle 2', () => {
      /* May need to add or remove some elements. */
      let oldElementsNum = 20,
        newElementsNum = 30;
      let oldElementsIds = [],
        newElementsIds = [];
      for (let i = 1; i <= oldElementsNum + 10; i++) oldElementsIds.push(i);
      for (let i = 1; i <= newElementsNum + 10; i++) newElementsIds.push(i);
      shuffle(oldElementsIds);
      shuffle(newElementsIds);
      oldElementsIds = oldElementsIds.slice(0, oldElementsNum);
      newElementsIds = newElementsIds.slice(0, newElementsNum);
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: oldElementsIds.map((c) => ({
            tagName: 'span',
            id: c,
          })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(oldElementsNum);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: newElementsIds.map((c) => ({
            tagName: 'span',
            id: c,
          })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(newElementsNum);
      diff(node, rrNode, replayer);
      expect(node.childNodes.length).toEqual(newElementsNum);
      expect(rrNode.childNodes.length).toEqual(newElementsNum);
      expect(Array.from(node.childNodes).map((c) => mirror.getId(c))).toEqual(
        newElementsIds,
      );
    });
  });

  describe('diff shadow dom', () => {
    it('should add a shadow dom', () => {
      const tagName = 'DIV';
      const node = document.createElement(tagName);
      mirror.add(node, {
        ...elementSn,
        tagName,
        id: 1,
      } as serializedNodeWithId);

      expect(((node as Node) as HTMLElement).shadowRoot).toBeNull();

      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      const sn2 = Object.assign({}, elementSn, { tagName, id: 1 });
      rrDocument.mirror.add(rrNode, sn2);

      rrNode.attachShadow({ mode: 'open' });
      const child = rrDocument.createElement('div');
      const sn3 = Object.assign({}, elementSn, { tagName, id: 2 });
      rrDocument.mirror.add(child, sn3);

      rrNode.shadowRoot!.appendChild(child);
      expect(rrNode.shadowRoot!.childNodes.length).toBe(1);

      diff(node, rrNode, replayer, rrDocument.mirror);
      expect(((node as Node) as HTMLElement).shadowRoot).not.toBeNull();
      expect(
        ((node as Node) as HTMLElement).shadowRoot!.childNodes.length,
      ).toBe(1);
      const childElement = ((node as Node) as HTMLElement).shadowRoot!
        .childNodes[0] as HTMLElement;
      expect(childElement.tagName).toEqual('DIV');
    });
  });

  describe('diff iframe elements', () => {
    it('should add an element to the contentDocument of an iframe element', () => {
      document.write('<html></html>');
      const node = document.createElement('iframe');
      document.documentElement.appendChild(node);
      expect(node.contentDocument).toBeDefined();

      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement('iframe');
      rrDocument.mirror.add(
        rrNode.contentDocument,
        getDefaultSN(rrNode.contentDocument, 1),
      );
      const childElement = rrNode.contentDocument.createElement('div');

      rrNode.contentDocument.appendChild(childElement);
      rrDocument.mirror.add(childElement, {
        ...elementSn,
        tagName: 'div',
        id: 2,
      } as serializedNodeWithId);

      diff(node, rrNode, replayer);
      expect(node.contentDocument!.childNodes.length).toBe(1);
      const element = node.contentDocument!.childNodes[0] as HTMLElement;
      expect(element.tagName).toBe('DIV');
      expect(mirror.getId(element)).toEqual(2);
    });
  });

  describe('create or get a Node', () => {
    it('create a real HTML element from RRElement', () => {
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement('DIV');
      const sn2 = Object.assign({}, elementSn, { id: 0 });
      rrDocument.mirror.add(rrNode, sn2);

      let result = createOrGetNode(rrNode, mirror, rrDocument.mirror);
      expect(result).toBeInstanceOf(HTMLElement);
      expect(mirror.getId(result)).toBe(0);
      expect(((result as Node) as HTMLElement).tagName).toBe('DIV');
    });

    it('create a node from RRNode', () => {
      const rrDocument = new RRDocument();
      rrDocument.mirror.add(rrDocument, getDefaultSN(rrDocument, 0));
      let result = createOrGetNode(rrDocument, mirror, rrDocument.mirror);
      expect(result).toBeInstanceOf(Document);
      expect(mirror.getId(result)).toBe(0);

      const textContent = 'Text Content';
      let rrNode: RRNode = rrDocument.createTextNode(textContent);
      rrDocument.mirror.add(rrNode, getDefaultSN(rrNode, 1));
      result = createOrGetNode(rrNode, mirror, rrDocument.mirror);
      expect(result).toBeInstanceOf(Text);
      expect(mirror.getId(result)).toBe(1);
      expect(((result as Node) as Text).textContent).toBe(textContent);

      rrNode = rrDocument.createComment(textContent);
      rrDocument.mirror.add(rrNode, getDefaultSN(rrNode, 2));
      result = createOrGetNode(rrNode, mirror, rrDocument.mirror);
      expect(result).toBeInstanceOf(Comment);
      expect(mirror.getId(result)).toBe(2);
      expect(((result as Node) as Comment).textContent).toBe(textContent);

      rrNode = rrDocument.createCDATASection('');
      rrDocument.mirror.add(rrNode, getDefaultSN(rrNode, 3));
      expect(() =>
        createOrGetNode(rrNode, mirror, rrDocument.mirror),
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot create CDATA sections in HTML documents"`,
      );
    });

    it('create a DocumentType from RRDocumentType', () => {
      const rrDocument = new RRDocument();
      const publicId = '-//W3C//DTD XHTML 1.0 Transitional//EN';
      let rrNode: RRNode = rrDocument.createDocumentType('html', publicId, '');
      rrDocument.mirror.add(rrNode, getDefaultSN(rrNode, 0));
      let result = createOrGetNode(rrNode, mirror, rrDocument.mirror);
      expect(result).toBeInstanceOf(DocumentType);
      expect(mirror.getId(result)).toBe(0);
      expect(((result as Node) as DocumentType).name).toEqual('html');
      expect(((result as Node) as DocumentType).publicId).toEqual(publicId);
      expect(((result as Node) as DocumentType).systemId).toEqual('');
    });

    it('can get a node if it already exists', () => {
      const rrDocument = new RRDocument();
      const textContent = 'Text Content';
      const text = document.createTextNode(textContent);
      const sn: serializedNodeWithId = {
        id: 0,
        type: RRNodeType.Text,
        textContent: 'text of the existed node',
      };
      // Add the text node to the mirror to make it look like already existing.
      mirror.add(text, sn);
      const rrNode: RRNode = rrDocument.createTextNode(textContent);
      rrDocument.mirror.add(rrNode, getDefaultSN(rrNode, 0));
      let result = createOrGetNode(rrNode, mirror, rrDocument.mirror);

      expect(result).toBeInstanceOf(Text);
      expect(mirror.getId(result)).toBe(0);
      expect(((result as Node) as Text).textContent).toBe(textContent);
      expect(result).toEqual(text);
      // To make sure the existed text node is used.
      expect(mirror.getMeta(result)).toEqual(mirror.getMeta(text));
    });
  });

  describe('apply virtual style rules to node', () => {
    it('should insert rule at index 0 in empty sheet', () => {
      document.write('<style></style>');
      const styleEl = document.getElementsByTagName('style')[0];

      const cssText = '.added-rule {border: 1px solid yellow;}';

      const virtualStyleRules: VirtualStyleRules = [
        { cssText, index: 0, type: StyleRuleType.Insert },
      ];
      applyVirtualStyleRulesToNode(styleEl, virtualStyleRules);

      expect(styleEl.sheet?.cssRules?.length).toEqual(1);
      expect(styleEl.sheet?.cssRules[0].cssText).toEqual(cssText);
    });

    it('should insert rule at index 0 and keep exsisting rules', () => {
      document.write(`
      <style>
        a {color: blue}
        div {color: black}
      </style>
    `);
      const styleEl = document.getElementsByTagName('style')[0];

      const cssText = '.added-rule {border: 1px solid yellow;}';
      const virtualStyleRules: VirtualStyleRules = [
        { cssText, index: 0, type: StyleRuleType.Insert },
      ];
      applyVirtualStyleRulesToNode(styleEl, virtualStyleRules);

      expect(styleEl.sheet?.cssRules?.length).toEqual(3);
      expect(styleEl.sheet?.cssRules[0].cssText).toEqual(cssText);
    });

    it('should delete rule at index 0', () => {
      document.write(`
        <style>
          a {color: blue;}
          div {color: black;}
        </style>
      `);
      const styleEl = document.getElementsByTagName('style')[0];

      const virtualStyleRules: VirtualStyleRules = [
        { index: 0, type: StyleRuleType.Remove },
      ];
      applyVirtualStyleRulesToNode(styleEl, virtualStyleRules);

      expect(styleEl.sheet?.cssRules?.length).toEqual(1);
      expect(styleEl.sheet?.cssRules[0].cssText).toEqual('div {color: black;}');
    });

    // JSDOM/CSSOM is currently broken for this test
    // remove '.skip' once https://github.com/NV/CSSOM/pull/113#issue-712485075 is merged
    it('should insert rule at index [0,0] and keep existing rules', () => {
      document.write(`
        <style>
          @media {
            a {color: blue}
            div {color: black}
          }
        </style>
      `);
      const styleEl = document.getElementsByTagName('style')[0];

      const cssText = '.added-rule {border: 1px solid yellow;}';
      const virtualStyleRules: VirtualStyleRules = [
        { cssText, index: [0, 0], type: StyleRuleType.Insert },
      ];
      applyVirtualStyleRulesToNode(styleEl, virtualStyleRules);

      expect(
        (styleEl.sheet?.cssRules[0] as CSSMediaRule).cssRules?.length,
      ).toEqual(3);
      expect(
        (styleEl.sheet?.cssRules[0] as CSSMediaRule).cssRules[0].cssText,
      ).toEqual(cssText);
    });

    it('should delete rule at index [0,1]', () => {
      document.write(`
        <style>
          @media {
            a {color: blue;}
            div {color: black;}
          }
        </style>
      `);
      const styleEl = document.getElementsByTagName('style')[0];

      const virtualStyleRules: VirtualStyleRules = [
        { index: [0, 1], type: StyleRuleType.Remove },
      ];
      applyVirtualStyleRulesToNode(styleEl, virtualStyleRules);

      expect(
        (styleEl.sheet?.cssRules[0] as CSSMediaRule).cssRules?.length,
      ).toEqual(1);
      expect(
        (styleEl.sheet?.cssRules[0] as CSSMediaRule).cssRules[0].cssText,
      ).toEqual('a {color: blue;}');
    });
  });
});
