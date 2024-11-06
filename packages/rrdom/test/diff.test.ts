/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { vi, MockInstance } from 'vitest';
import {
  NodeType as RRNodeType,
  createMirror,
  Mirror as NodeMirror,
  serializedNodeWithId,
} from '@saola.ai/rrweb-snapshot';
import {
  buildFromDom,
  getDefaultSN,
  Mirror as RRNodeMirror,
  RRDocument,
  RRMediaElement,
  printRRDom,
} from '../src';
import {
  createOrGetNode,
  diff,
  ReplayerHandler,
  nodeMatching,
  sameNodeType,
} from '../src/diff';
import type { IRRElement, IRRNode } from '../src/document';
import type {
  canvasMutationData,
  styleSheetRuleData,
} from '@saola.ai/rrweb-types';
import { EventType, IncrementalSource } from '@saola.ai/rrweb-types';

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
  mirror: NodeMirror = createMirror(),
): Node | RRNode {
  type TNode = typeof rrDocument extends RRDocument ? RRNode : Node;
  let root: TNode;

  root = (
    rrDocument
      ? rrDocument.createElement(treeNode.tagName)
      : document.createElement(treeNode.tagName)
  ) as TNode;

  const sn = Object.assign({}, elementSn, {
    tagName: treeNode.tagName,
    id: treeNode.id,
  });

  if (rrDocument) {
    rrDocument.mirror.add(root as unknown as RRNode, sn);
  } else {
    mirror.add(root as unknown as Node, sn);
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
  let mirror: NodeMirror;
  let replayer: ReplayerHandler;
  let warn: MockInstance;

  beforeEach(() => {
    mirror = createMirror();
    replayer = {
      mirror,
      applyCanvas: () => {},
      applyInput: () => {},
      applyScroll: () => {},
      applyStyleSheetMutation: () => {},
      afterAppend: () => {},
    };
    document.write('<!DOCTYPE html><html><head></head><body></body></html>');
    // Mock the original console.warn function to make the test fail once console.warn is called.
    warn = vi.spyOn(console, 'warn');
  });

  afterEach(() => {
    // Check that warn was not called (fail on warning)
    expect(warn).not.toBeCalled();
    warn.mockRestore();
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
      const applyScrollFn = vi.spyOn(replayer, 'applyScroll');
      diff(document, rrNode, replayer);
      expect(document.childNodes.length).toEqual(1);
      expect(document.childNodes[0]).toBeInstanceOf(DocumentType);
      expect(document.doctype?.name).toEqual('html');
      expect(document.doctype?.publicId).toEqual(
        '-//W3C//DTD XHTML 1.0 Transitional//EN',
      );
      expect(document.doctype?.systemId).toEqual('');
      expect(applyScrollFn).toHaveBeenCalledTimes(1);
      applyScrollFn.mockRestore();
    });

    it('should apply scroll data on an element', () => {
      const element = document.createElement('div');
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement('div');
      rrNode.scrollData = {
        source: IncrementalSource.Scroll,
        id: 0,
        x: 0,
        y: 0,
      };
      const applyScrollFn = vi.spyOn(replayer, 'applyScroll');
      diff(element, rrNode, replayer);
      expect(applyScrollFn).toHaveBeenCalledTimes(1);
      applyScrollFn.mockRestore();
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
      replayer.applyInput = vi.fn();
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
      const styleData: styleSheetRuleData = {
        source: IncrementalSource.StyleSheetRule,
        adds: [
          {
            rule: 'div{color: black;}',
            index: 0,
          },
        ],
      };
      rrStyle.rules = [styleData];
      replayer.applyStyleSheetMutation = vi.fn();
      diff(element, rrStyle, replayer);
      expect(replayer.applyStyleSheetMutation).toHaveBeenCalledTimes(1);
      expect(replayer.applyStyleSheetMutation).toHaveBeenCalledWith(
        styleData,
        element.sheet,
      );
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
      replayer.applyCanvas = vi.fn();
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
        expect(element.playbackRate).toEqual(1);

        const rrDocument = new RRDocument();
        const rrMedia = rrDocument.createElement(
          tagName,
        ) as unknown as RRMediaElement;
        rrMedia.volume = 0.5;
        rrMedia.currentTime = 100;
        rrMedia.muted = true;
        rrMedia.paused = false;
        rrMedia.playbackRate = 0.5;
        rrMedia.loop = false;

        diff(element, rrMedia, replayer);
        expect(element.volume).toEqual(0.5);
        expect(element.currentTime).toEqual(100);
        expect(element.muted).toEqual(true);
        expect(element.paused).toEqual(false);
        expect(element.playbackRate).toEqual(0.5);
        expect(element.loop).toEqual(false);

        rrMedia.paused = true;
        diff(element, rrMedia, replayer);
        expect(element.paused).toEqual(true);
      }
    });

    it('should diff a node with different node type', () => {
      // When the diff target has a different node type.
      let parentNode: Node = document.createElement('div');
      let unreliableNode: Node = document.createTextNode('');
      parentNode.appendChild(unreliableNode);
      const rrNode = new RRDocument().createElement('li');
      diff(unreliableNode, rrNode, replayer);
      expect(parentNode.childNodes.length).toEqual(1);
      expect(parentNode.childNodes[0]).toBeInstanceOf(HTMLElement);
      expect((parentNode.childNodes[0] as HTMLElement).tagName).toEqual('LI');

      // When the diff target has the same node type but with different tagName.
      parentNode = document.createElement('div');
      unreliableNode = document.createElement('span');
      parentNode.appendChild(unreliableNode);
      diff(unreliableNode, rrNode, replayer);
      expect((parentNode.childNodes[0] as HTMLElement).tagName).toEqual('LI');

      // When the diff target is a node without parentNode.
      unreliableNode = document.createComment('');
      diff(unreliableNode, rrNode, replayer);
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
      expect((node as Node as HTMLElement).id).toBe('node1');
      expect((node as Node as HTMLElement).className).toBe('node');
    });

    it('ignores invalid attributes', () => {
      const tagName = 'DIV';
      const node = document.createElement(tagName);
      const sn = Object.assign({}, elementSn, {
        attributes: { '@click': 'foo' },
        tagName,
      });
      mirror.add(node, sn);

      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      const sn2 = Object.assign({}, elementSn, {
        attributes: { '@click': 'foo' },
        tagName,
      });
      rrDocument.mirror.add(rrNode, sn2);

      rrNode.attributes = { id: 'node1', class: 'node', '@click': 'foo' };
      diff(node, rrNode, replayer);
      expect((node as Node as HTMLElement).id).toBe('node1');
      expect((node as Node as HTMLElement).className).toBe('node');
      expect('@click' in (node as Node as HTMLElement)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockClear();
    });

    it('can update exist properties', () => {
      const tagName = 'DIV';
      const node = document.createElement(tagName);
      const sn = Object.assign({}, elementSn, { tagName });
      mirror.add(node, sn);

      (node as Node as HTMLElement).id = 'element1';
      (node as Node as HTMLElement).className = 'element';
      (node as Node as HTMLElement).setAttribute('style', 'color: black');
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      const sn2 = Object.assign({}, elementSn, { tagName });
      rrDocument.mirror.add(rrNode, sn2);

      rrNode.attributes = { id: 'node1', class: 'node', style: 'color: white' };
      diff(node, rrNode, replayer);
      expect((node as Node as HTMLElement).id).toBe('node1');
      expect((node as Node as HTMLElement).className).toBe('node');
      expect((node as Node as HTMLElement).getAttribute('style')).toBe(
        'color: white',
      );

      rrNode.attributes = { id: 'node2' };
      diff(node, rrNode, replayer);
      expect((node as Node as HTMLElement).id).toBe('node2');
      expect((node as Node as HTMLElement).className).toBe('');
      expect((node as Node as HTMLElement).getAttribute('style')).toBe(null);
    });

    it('can delete old properties', () => {
      const tagName = 'DIV';
      const node = document.createElement(tagName);
      const sn = Object.assign({}, elementSn, { tagName });
      mirror.add(node, sn);

      (node as Node as HTMLElement).id = 'element1';
      (node as Node as HTMLElement).className = 'element';
      (node as Node as HTMLElement).setAttribute('style', 'color: black');
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      const sn2 = Object.assign({}, elementSn, { tagName });
      rrDocument.mirror.add(rrNode, sn2);

      rrNode.attributes = { id: 'node1' };
      diff(node, rrNode, replayer);
      expect((node as Node as HTMLElement).id).toBe('node1');
      expect((node as Node as HTMLElement).className).toBe('');
      expect((node as Node as HTMLElement).getAttribute('style')).toBe(null);

      rrNode.attributes = { src: 'link' };
      diff(node, rrNode, replayer);
      expect((node as Node as HTMLElement).id).toBe('');
      expect((node as Node as HTMLElement).className).toBe('');
      expect((node as Node as HTMLElement).getAttribute('src')).toBe('link');
    });

    it('can diff scroll positions', () => {
      const tagName = 'DIV';
      const node = document.createElement(tagName);
      const sn = Object.assign({}, elementSn, { tagName });
      mirror.add(node, sn);

      expect((node as Node as HTMLElement).scrollLeft).toEqual(0);
      expect((node as Node as HTMLElement).scrollTop).toEqual(0);
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      const sn2 = Object.assign({}, elementSn, { tagName });
      rrDocument.mirror.add(rrNode, sn2);

      rrNode.scrollLeft = 100;
      rrNode.scrollTop = 200;
      diff(node, rrNode, replayer);
      expect((node as Node as HTMLElement).scrollLeft).toEqual(100);
      expect((node as Node as HTMLElement).scrollTop).toEqual(200);
    });

    it('can diff properties for SVG elements', () => {
      const element = document.createElement('svg');
      const rrDocument = new RRDocument();
      const node = rrDocument.createElement('svg');
      const sn = Object.assign({}, elementSn, { tagName: 'svg', isSVG: true });
      rrDocument.mirror.add(node, sn);

      const value = 'http://www.w3.org/2000/svg';
      node.attributes.xmlns = value;

      vi.spyOn(Element.prototype, 'setAttributeNS');
      diff(element, node, replayer);
      expect((element as Node as SVGElement).getAttribute('xmlns')).toBe(value);
      expect(SVGElement.prototype.setAttributeNS).toHaveBeenCalledWith(
        'http://www.w3.org/2000/xmlns/',
        'xmlns',
        value,
      );
      vi.restoreAllMocks();
    });

    it('can diff properties for canvas', async () => {
      const element = document.createElement('canvas');
      const rrDocument = new RRDocument();
      const rrCanvas = rrDocument.createElement('canvas');
      const sn = Object.assign({}, elementSn, { tagName: 'canvas' });
      rrDocument.mirror.add(rrCanvas, sn);
      rrCanvas.attributes['rr_dataURL'] = 'data:image/png;base64,';

      vi.spyOn(document, 'createElement');

      diff(element, rrCanvas, replayer);
      expect(document.createElement).toHaveBeenCalledWith('img');
      vi.restoreAllMocks();
    });

    it('can omit srcdoc attribute of iframe element', () => {
      // If srcdoc attribute is set, the content of iframe recorded by rrweb will be override.
      const element = document.createElement('iframe');
      const rrDocument = new RRDocument();
      const rrIframe = rrDocument.createElement('iframe');
      const sn = Object.assign({}, elementSn, { tagName: 'iframe' });
      rrDocument.mirror.add(rrIframe, sn);
      rrIframe.attributes['srcdoc'] = '<html></html>';

      diff(element, rrIframe, replayer);
      expect(element.getAttribute('srcdoc')).toBe(null);
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
        1, 2, 3,
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
        1, 2, 3, 4, 5,
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
        1, 2, 3, 4, 5,
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
        1, 2, 3, 4, 5,
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
        1, 2, 3,
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
        1, 2, 3, 4, 5,
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
        3, 4, 5,
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
        1, 2, 3, 4, 5,
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
        1, 2, 3,
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
        1, 2, 3, 4, 5,
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
        1, 2, 4, 5,
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
        1, 2, 3, 4, 5,
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
        2, 3, 4, 1, 5,
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
        1, 2, 3,
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
        2, 3, 1,
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
        1, 4, 2, 3,
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
        4, 2, 3, 1,
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
        4, 1, 2, 3, 6,
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
        4, 6,
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
        8, 7, 6, 5, 4, 3, 2, 1,
      ]);
    });

    it('handle random shuffle 1', () => {
      /* Number of elements remains the same and no element will be added or removed. */
      let oldElementsNum = 15,
        newElementsNum = 15;
      let oldElementsIds: number[] = [],
        newElementsIds: number[] = [];
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
      let oldElementsIds: number[] = [],
        newElementsIds: number[] = [];
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

    it('should diff children with unreliable Mirror', () => {
      const parentNode = createTree(
        {
          tagName: 'div',
          id: 0,
          children: [],
        },
        undefined,
        mirror,
      ) as Node;
      // Construct unreliable Mirror data.
      const unreliableChild = document.createTextNode('');
      const unreliableSN = {
        id: 1,
        textContent: '',
        type: RRNodeType.Text,
      } as serializedNodeWithId;
      mirror.add(unreliableChild, unreliableSN);
      parentNode.appendChild(unreliableChild);
      createTree(
        {
          tagName: 'div',
          id: 2,
          children: [],
        },
        undefined,
        mirror,
      );

      const rrParentNode = createTree(
        {
          tagName: 'div',
          id: 0,
          children: [1].map((c) => ({
            tagName: 'span',
            id: c,
            children: [2].map((c1) => ({
              tagName: 'li',
              id: c1,
            })),
          })),
        },
        new RRDocument(),
      ) as RRNode;
      const id = 'correctElement';
      (rrParentNode.childNodes[0] as IRRElement).setAttribute('id', id);
      diff(parentNode, rrParentNode, replayer);

      expect(parentNode.childNodes.length).toEqual(1);
      expect(parentNode.childNodes[0]).toBeInstanceOf(HTMLElement);

      const spanChild = parentNode.childNodes[0] as HTMLElement;
      expect(spanChild.tagName).toEqual('SPAN');
      expect(spanChild.id).toEqual(id);
      expect(spanChild.childNodes.length).toEqual(1);
      expect(spanChild.childNodes[0]).toBeInstanceOf(HTMLElement);

      const liChild = spanChild.childNodes[0] as HTMLElement;
      expect(liChild.tagName).toEqual('LI');
    });

    it('should handle corner case with children removed during diff process', () => {
      /**
       * This test case is to simulate the following scenario:
       * The old tree structure:
       * 0 P
       *  1 SPAN
       *  2 SPAN
       * The new tree structure:
       * 0 P
       *  1 SPAN
       *   2 SPAN
       *  3 SPAN
       */
      const node = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2].map((c) => ({ tagName: 'span', id: c })),
        },
        undefined,
        mirror,
      ) as Node;
      expect(node.childNodes.length).toEqual(2);
      const rrdom = new RRDocument();
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [
            { tagName: 'span', id: 1, children: [{ tagName: 'span', id: 2 }] },
            { tagName: 'span', id: 3 },
          ],
        },
        rrdom,
      ) as RRNode;
      expect(printRRDom(rrNode, rrdom.mirror)).toMatchInlineSnapshot(`
        "0 P 
          1 SPAN 
            2 SPAN 
          3 SPAN 
        "
      `);
      diff(node, rrNode, replayer);

      expect(node.childNodes.length).toEqual(2);
      expect(node.childNodes[0].childNodes.length).toEqual(1);
      expect(mirror.getId(node.childNodes[1])).toEqual(3);
      expect(node.childNodes[0].childNodes.length).toEqual(1);
      expect(mirror.getId(node.childNodes[0].childNodes[0])).toEqual(2);
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

      expect((node as Node as HTMLElement).shadowRoot).toBeNull();

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
      expect((node as Node as HTMLElement).shadowRoot).not.toBeNull();
      expect((node as Node as HTMLElement).shadowRoot!.childNodes.length).toBe(
        1,
      );
      const childElement = (node as Node as HTMLElement).shadowRoot!
        .childNodes[0] as HTMLElement;
      expect(childElement.tagName).toEqual('DIV');
    });
  });

  describe('diff iframe elements', () => {
    vi.setConfig({ testTimeout: 60_000 });

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

    it('should remove children from document before adding new nodes', () => {
      document.write('<style></style>'); // old document with elements that need removing

      const rrDocument = new RRDocument();
      const docType = rrDocument.createDocumentType('html', '', '');
      rrDocument.mirror.add(docType, getDefaultSN(docType, 1));
      rrDocument.appendChild(docType);
      const htmlEl = rrDocument.createElement('html');
      rrDocument.mirror.add(htmlEl, getDefaultSN(htmlEl, 2));
      rrDocument.appendChild(htmlEl);

      diff(document, rrDocument, replayer);
      expect(document.childNodes.length).toBe(2);
      const element = document.childNodes[0] as HTMLElement;
      expect(element.nodeType).toBe(element.DOCUMENT_TYPE_NODE);
      expect(mirror.getId(element)).toEqual(1);
    });

    it('should remove children from document before adding new nodes 2', () => {
      document.write('<html><iframe></iframe></html>');

      const iframe = document.querySelector('iframe')!;
      // Remove everthing from the iframe but the root html element
      // `buildNodeWithSn` injects docType elements to trigger compatMode in iframes
      iframe.contentDocument!.write(
        '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">',
      );

      replayer.mirror.add(iframe.contentDocument!, {
        id: 1,
        type: 0,
        childNodes: [
          {
            id: 2,
            rootId: 1,
            type: 2,
            tagName: 'html',
            childNodes: [],
            attributes: {},
          },
        ],
      } as serializedNodeWithId);
      replayer.mirror.add(iframe.contentDocument!.childNodes[0], {
        id: 2,
        rootId: 1,
        type: 2,
        tagName: 'html',
        childNodes: [],
        attributes: {},
      } as serializedNodeWithId);

      const rrDocument = new RRDocument();
      rrDocument.mirror.add(rrDocument, getDefaultSN(rrDocument, 1));
      const docType = rrDocument.createDocumentType('html', '', '');
      rrDocument.mirror.add(docType, getDefaultSN(docType, 2));
      rrDocument.appendChild(docType);
      const htmlEl = rrDocument.createElement('html');
      rrDocument.mirror.add(htmlEl, getDefaultSN(htmlEl, 3));
      rrDocument.appendChild(htmlEl);
      const styleEl = rrDocument.createElement('style');
      rrDocument.mirror.add(styleEl, getDefaultSN(styleEl, 4));
      htmlEl.appendChild(styleEl);
      const headEl = rrDocument.createElement('head');
      rrDocument.mirror.add(headEl, getDefaultSN(headEl, 5));
      htmlEl.appendChild(headEl);
      const bodyEl = rrDocument.createElement('body');
      rrDocument.mirror.add(bodyEl, getDefaultSN(bodyEl, 6));
      htmlEl.appendChild(bodyEl);

      diff(iframe.contentDocument!, rrDocument, replayer);
      expect(iframe.contentDocument!.childNodes.length).toBe(2);
      const element = iframe.contentDocument!.childNodes[0] as HTMLElement;
      expect(element.nodeType).toBe(element.DOCUMENT_TYPE_NODE);
      expect(mirror.getId(element)).toEqual(2);
    });

    it('should remove children from document before adding new nodes 3', () => {
      document.write('<html><body><iframe></iframe></body></html>');

      const iframeInDom = document.querySelector('iframe')!;

      replayer.mirror.add(iframeInDom, {
        id: 3,
        type: 2,
        rootId: 1,
        tagName: 'iframe',
        childNodes: [],
        attributes: {},
      } as serializedNodeWithId);
      replayer.mirror.add(iframeInDom.contentDocument!, {
        id: 4,
        type: 0,
        childNodes: [],
      } as serializedNodeWithId);

      const rrDocument = new RRDocument();

      const rrIframeEl = rrDocument.createElement('iframe');
      rrDocument.mirror.add(rrIframeEl, getDefaultSN(rrIframeEl, 3));
      rrDocument.appendChild(rrIframeEl);
      rrDocument.mirror.add(
        rrIframeEl.contentDocument!,
        getDefaultSN(rrIframeEl.contentDocument!, 4),
      );

      const rrDocType = rrDocument.createDocumentType('html', '', '');
      rrIframeEl.contentDocument.appendChild(rrDocType);
      const rrHtmlEl = rrDocument.createElement('html');
      rrDocument.mirror.add(rrHtmlEl, getDefaultSN(rrHtmlEl, 6));
      rrIframeEl.contentDocument.appendChild(rrHtmlEl);
      const rrHeadEl = rrDocument.createElement('head');
      rrDocument.mirror.add(rrHeadEl, getDefaultSN(rrHeadEl, 8));
      rrHtmlEl.appendChild(rrHeadEl);
      const bodyEl = rrDocument.createElement('body');
      rrDocument.mirror.add(bodyEl, getDefaultSN(bodyEl, 9));
      rrHtmlEl.appendChild(bodyEl);

      diff(iframeInDom, rrIframeEl, replayer);
      expect(iframeInDom.contentDocument!.childNodes.length).toBe(2);
      const element = iframeInDom.contentDocument!.childNodes[0] as HTMLElement;
      expect(element.nodeType).toBe(element.DOCUMENT_TYPE_NODE);
      expect(mirror.getId(element)).toEqual(-1);
    });

    it('should remove children from document before adding new nodes 4', () => {
      /**
       * This case aims to test whether the diff function can remove all the old doctype  and html element from the document before adding new doctype and html element.
       * If not, the diff function will throw errors or warnings.
       */
      // Mock the original console.warn function to make the test fail once console.warn is called.
      const warn = vi.spyOn(global.console, 'warn');

      document.write('<!DOCTYPE html><html><body></body></html>');
      const rrdom = new RRDocument();
      /**
       * Make the structure of document and RRDom look like this:
       * -2 Document
       *  -3 DocumentType
       *  -4 HTML
       *    -5 HEAD
       *    -6 BODY
       */
      buildFromDom(document, mirror, rrdom);
      expect(mirror.getId(document)).toBe(-2);
      expect(mirror.getId(document.body)).toBe(-6);
      expect(rrdom.mirror.getId(rrdom)).toBe(-2);
      expect(rrdom.mirror.getId(rrdom.body)).toBe(-6);

      while (rrdom.firstChild) rrdom.removeChild(rrdom.firstChild);
      /**
       * Rebuild the rrdom and make it looks like this:
       * -7 RRDocument
       *  -8 RRDocumentType
       *  -9 HTML
       *    -10 HEAD
       *    -11 BODY
       */
      buildFromDom(document, undefined, rrdom);
      // Keep the ids of real document unchanged.
      expect(mirror.getId(document)).toBe(-2);
      expect(mirror.getId(document.body)).toBe(-6);

      expect(rrdom.mirror.getId(rrdom)).toBe(-7);
      expect(rrdom.mirror.getId(rrdom.body)).toBe(-11);

      // Diff the document with the new rrdom.
      diff(document, rrdom, replayer);
      // Check that warn was not called (fail on warning)
      expect(warn).not.toHaveBeenCalled();

      // Check that the old nodes are removed from the NodeMirror.
      [-2, -3, -4, -5, -6].forEach((id) =>
        expect(mirror.getNode(id)).toBeNull(),
      );
      expect(mirror.getId(document)).toBe(-7);
      expect(mirror.getId(document.doctype)).toBe(-8);
      expect(mirror.getId(document.documentElement)).toBe(-9);
      expect(mirror.getId(document.head)).toBe(-10);
      expect(mirror.getId(document.body)).toBe(-11);

      warn.mockRestore();
    });

    it('selectors should be case-sensitive for matching in iframe dom', async () => {
      /**
       * If the selector match is case insensitive, it will cause some CSS style problems in the replayer.
       * This test result executed in JSDom is different from that in real browser so we use puppeteer as test environment.
       */
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto('about:blank');

      try {
        const code = fs.readFileSync(
          path.resolve(__dirname, '../dist/rrdom.umd.cjs'),
          'utf8',
        );
        await page.evaluate(code);

        const className = 'case-sensitive';
        // To show the selector match pattern (case sensitive) in normal dom.
        const caseInsensitiveInNormalDom = await page.evaluate((className) => {
          document.write(
            '<!DOCTYPE html><html><body><iframe></iframe></body></html>',
          );
          const htmlEl = document.documentElement;
          htmlEl.className = className.toLowerCase();
          return htmlEl.matches(`.${className.toUpperCase()}`);
        }, className);
        expect(caseInsensitiveInNormalDom).toBeFalsy();

        // To show the selector match pattern (case insensitive) in auto mounted iframe dom.
        const caseInsensitiveInDefaultIFrameDom = await page.evaluate(
          (className) => {
            const iframeEl = document.querySelector('iframe');
            const htmlEl = iframeEl?.contentDocument?.documentElement;
            if (htmlEl) {
              htmlEl.className = className.toLowerCase();
              return htmlEl.matches(`.${className.toUpperCase()}`);
            }
          },
          className,
        );
        expect(caseInsensitiveInDefaultIFrameDom).toBeTruthy();

        const iframeElId = 3,
          iframeDomId = 4,
          htmlElId = 5;
        const result = await page.evaluate(`
          const iframeEl = document.querySelector('iframe');

          // Construct a virtual dom tree.
          const rrDocument = new rrdom.RRDocument();
          const rrIframeEl = rrDocument.createElement('iframe');
          rrDocument.mirror.add(rrIframeEl, rrdom.getDefaultSN(rrIframeEl, ${iframeElId}));
          rrDocument.appendChild(rrIframeEl);
          rrDocument.mirror.add(
            rrIframeEl.contentDocument,
            rrdom.getDefaultSN(rrIframeEl.contentDocument, ${iframeDomId}),
          );
          const rrDocType = rrDocument.createDocumentType('html', '', '');
          rrIframeEl.contentDocument.appendChild(rrDocType);
          const rrHtmlEl = rrDocument.createElement('html');
          rrDocument.mirror.add(rrHtmlEl, rrdom.getDefaultSN(rrHtmlEl, ${htmlElId}));
          rrIframeEl.contentDocument.appendChild(rrHtmlEl);
          
          const replayer = {
            mirror: rrdom.createMirror(),
            applyCanvas: () => {},
            applyInput: () => {},
            applyScroll: () => {},
            applyStyleSheetMutation: () => {},
          };
          rrdom.diff(iframeEl, rrIframeEl, replayer);
          
          iframeEl.contentDocument.documentElement.className =
            '${className.toLowerCase()}';
          iframeEl.contentDocument.childNodes.length === 2 &&
            replayer.mirror.getId(iframeEl.contentDocument.documentElement) === ${htmlElId} &&
            // To test whether the selector match of the updated iframe document is case sensitive or not.
            !iframeEl.contentDocument.documentElement.matches(
              '.${className.toUpperCase()}',
            );
        `);
        // IFrame document has two children, mirror id of documentElement is ${htmlElId}, and selectors should be case-sensitive for matching in iframe dom (consistent with the normal dom).
        expect(result).toBeTruthy();
      } finally {
        await page.close();
        await browser.close();
      }
    });
  });

  describe('afterAppend callback', () => {
    it('should call afterAppend callback', () => {
      const afterAppendFn = vi.spyOn(replayer, 'afterAppend');
      const node = createTree(
        {
          tagName: 'div',
          id: 1,
        },
        undefined,
        mirror,
      ) as Node;

      const rrdom = new RRDocument();
      const rrNode = createTree(
        {
          tagName: 'div',
          id: 1,
          children: [
            {
              tagName: 'span',
              id: 2,
            },
          ],
        },
        rrdom,
      ) as RRNode;
      diff(node, rrNode, replayer);
      expect(afterAppendFn).toHaveBeenCalledTimes(1);
      expect(afterAppendFn).toHaveBeenCalledWith(node.childNodes[0], 2);
      afterAppendFn.mockRestore();
    });

    it('should diff without afterAppend callback', () => {
      replayer.afterAppend = undefined;
      const rrdom = buildFromDom(document);
      document.open();
      diff(document, rrdom, replayer);
      replayer.afterAppend = () => {};
    });

    it('should call afterAppend callback in the post traversal order', () => {
      const afterAppendFn = vi.spyOn(replayer, 'afterAppend');
      document.open();

      const rrdom = new RRDocument();
      rrdom.mirror.add(rrdom, getDefaultSN(rrdom, 1));
      const rrNode = createTree(
        {
          tagName: 'html',
          id: 1,
          children: [
            {
              tagName: 'head',
              id: 2,
            },
            {
              tagName: 'body',
              id: 3,
              children: [
                {
                  tagName: 'span',
                  id: 4,
                  children: [
                    {
                      tagName: 'li',
                      id: 5,
                    },
                    {
                      tagName: 'li',
                      id: 6,
                    },
                  ],
                },
                {
                  tagName: 'p',
                  id: 7,
                },
                {
                  tagName: 'p',
                  id: 8,
                  children: [
                    {
                      tagName: 'li',
                      id: 9,
                    },
                    {
                      tagName: 'li',
                      id: 10,
                    },
                  ],
                },
              ],
            },
          ],
        },
        rrdom,
      ) as RRNode;
      diff(document, rrNode, replayer);

      expect(afterAppendFn).toHaveBeenCalledTimes(10);
      // the correct traversal order
      [2, 5, 6, 4, 7, 9, 10, 8, 3, 1].forEach((id, index) => {
        expect((mirror.getNode(id) as HTMLElement).tagName).toEqual(
          (rrdom.mirror.getNode(id) as IRRElement).tagName,
        );
        expect(afterAppendFn).toHaveBeenNthCalledWith(
          index + 1,
          mirror.getNode(id),
          id,
        );
      });
    });

    it('should only call afterAppend for newly created nodes', () => {
      const afterAppendFn = vi.spyOn(replayer, 'afterAppend');
      const rrdom = buildFromDom(document, replayer.mirror) as RRDocument;

      // Append 3 nodes to rrdom.
      const rrNode = createTree(
        {
          tagName: 'span',
          id: 1,
          children: [
            {
              tagName: 'li',
              id: 2,
            },
            {
              tagName: 'li',
              id: 3,
            },
          ],
        },
        rrdom,
      ) as RRNode;
      rrdom.body?.appendChild(rrNode);
      diff(document, rrdom, replayer);
      expect(afterAppendFn).toHaveBeenCalledTimes(3);
      // Should only call afterAppend for 3 newly appended nodes.
      [2, 3, 1].forEach((id, index) => {
        expect((mirror.getNode(id) as HTMLElement).tagName).toEqual(
          (rrdom.mirror.getNode(id) as IRRElement).tagName,
        );
        expect(afterAppendFn).toHaveBeenNthCalledWith(
          index + 1,
          mirror.getNode(id),
          id,
        );
      });
      afterAppendFn.mockClear();
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
      expect((result as Node as HTMLElement).tagName).toBe('DIV');
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
      expect((result as Node as Text).textContent).toBe(textContent);

      rrNode = rrDocument.createComment(textContent);
      rrDocument.mirror.add(rrNode, getDefaultSN(rrNode, 2));
      result = createOrGetNode(rrNode, mirror, rrDocument.mirror);
      expect(result).toBeInstanceOf(Comment);
      expect(mirror.getId(result)).toBe(2);
      expect((result as Node as Comment).textContent).toBe(textContent);

      rrNode = rrDocument.createCDATASection('');
      rrDocument.mirror.add(rrNode, getDefaultSN(rrNode, 3));
      expect(() =>
        createOrGetNode(rrNode, mirror, rrDocument.mirror),
      ).toThrowErrorMatchingInlineSnapshot(`DOMException {}`);
    });

    it('create a DocumentType from RRDocumentType', () => {
      const rrDocument = new RRDocument();
      const publicId = '-//W3C//DTD XHTML 1.0 Transitional//EN';
      let rrNode: RRNode = rrDocument.createDocumentType('html', publicId, '');
      rrDocument.mirror.add(rrNode, getDefaultSN(rrNode, 0));
      let result = createOrGetNode(rrNode, mirror, rrDocument.mirror);
      expect(result).toBeInstanceOf(DocumentType);
      expect(mirror.getId(result)).toBe(0);
      expect((result as Node as DocumentType).name).toEqual('html');
      expect((result as Node as DocumentType).publicId).toEqual(publicId);
      expect((result as Node as DocumentType).systemId).toEqual('');
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
      expect((result as Node as Text).textContent).toBe(textContent);
      expect(result).toEqual(text);
      // To make sure the existed text node is used.
      expect(mirror.getMeta(result)).toEqual(mirror.getMeta(text));
    });
  });

  describe('test sameNodeType function', () => {
    const rrdom = new RRDocument();
    it('should return true when two elements have same tagNames', () => {
      const div1 = document.createElement('div');
      const div2 = rrdom.createElement('div');
      expect(sameNodeType(div1, div2)).toBeTruthy();
    });

    it('should return false when two elements have different tagNames', () => {
      const div1 = document.createElement('div');
      const div2 = rrdom.createElement('span');
      expect(sameNodeType(div1, div2)).toBeFalsy();
    });

    it('should return false when two nodes have the same node type', () => {
      let node1: Node = new Document();
      let node2: IRRNode = new RRDocument();
      expect(sameNodeType(node1, node2)).toBeTruthy();

      node1 = document.implementation.createDocumentType('html', '', '');
      node2 = rrdom.createDocumentType('', '', '');
      expect(sameNodeType(node1, node2)).toBeTruthy();

      node1 = document.createTextNode('node1');
      node2 = rrdom.createTextNode('node2');
      expect(sameNodeType(node1, node2)).toBeTruthy();

      node1 = document.createComment('node1');
      node2 = rrdom.createComment('node2');
      expect(sameNodeType(node1, node2)).toBeTruthy();
    });

    it('should return false when two nodes have different node types', () => {
      let node1: Node = new Document();
      let node2: IRRNode = rrdom.createDocumentType('', '', '');
      expect(sameNodeType(node1, node2)).toBeFalsy();

      node1 = document.implementation.createDocumentType('html', '', '');
      node2 = new RRDocument();
      expect(sameNodeType(node1, node2)).toBeFalsy();

      node1 = document.createTextNode('node1');
      node2 = rrdom.createComment('node2');
      expect(sameNodeType(node1, node2)).toBeFalsy();

      node1 = document.createComment('node1');
      node2 = rrdom.createTextNode('node2');
      expect(sameNodeType(node1, node2)).toBeFalsy();
    });
  });

  describe('test nodeMatching function', () => {
    const rrdom = new RRDocument();
    const NodeMirror = createMirror();
    const rrdomMirror = new RRNodeMirror();
    beforeEach(() => {
      NodeMirror.reset();
      rrdomMirror.reset();
    });

    it('should return false when two nodes have different Ids', () => {
      const node1 = document.createElement('div');
      const node2 = rrdom.createElement('div');
      NodeMirror.add(node1, getDefaultSN(node2, 1));
      rrdomMirror.add(node2, getDefaultSN(node2, 2));
      expect(nodeMatching(node1, node2, NodeMirror, rrdomMirror)).toBeFalsy();
    });

    it('should return false when two nodes have same Ids but different node types', () => {
      // Compare an element with a comment node
      let node1: Node = document.createElement('div');
      NodeMirror.add(node1, getDefaultSN(rrdom.createElement('div'), 1));
      let node2: IRRNode = rrdom.createComment('test');
      rrdomMirror.add(node2, getDefaultSN(node2, 1));
      expect(nodeMatching(node1, node2, NodeMirror, rrdomMirror)).toBeFalsy();

      // Compare an element node with a text node
      node2 = rrdom.createTextNode('');
      rrdomMirror.add(node2, getDefaultSN(node2, 1));
      expect(nodeMatching(node1, node2, NodeMirror, rrdomMirror)).toBeFalsy();

      // Compare a document with a text node
      node1 = new Document();
      NodeMirror.add(node1, getDefaultSN(rrdom, 1));
      expect(nodeMatching(node1, node2, NodeMirror, rrdomMirror)).toBeFalsy();

      // Compare a document with a document type node
      node2 = rrdom.createDocumentType('', '', '');
      rrdomMirror.add(node2, getDefaultSN(node2, 1));
      expect(nodeMatching(node1, node2, NodeMirror, rrdomMirror)).toBeFalsy();
    });

    it('should compare two elements', () => {
      // Compare two elements with different tagNames
      let node1 = document.createElement('div');
      let node2 = rrdom.createElement('span');
      NodeMirror.add(node1, getDefaultSN(rrdom.createElement('div'), 1));
      rrdomMirror.add(node2, getDefaultSN(node2, 1));
      expect(nodeMatching(node1, node2, NodeMirror, rrdomMirror)).toBeFalsy();

      // Compare two elements with same tagNames but different attributes
      node2 = rrdom.createElement('div');
      node2.setAttribute('class', 'test');
      rrdomMirror.add(node2, getDefaultSN(node2, 1));
      expect(nodeMatching(node1, node2, NodeMirror, rrdomMirror)).toBeTruthy();

      // Should return false when two elements have same tagNames and attributes but different children
      rrdomMirror.add(node2, getDefaultSN(node2, 2));
      expect(nodeMatching(node1, node2, NodeMirror, rrdomMirror)).toBeFalsy();
    });
  });
});
