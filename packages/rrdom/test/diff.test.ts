/**
 * @jest-environment jsdom
 */
import {
  RRDocument,
  RRElement,
  RRNode,
  StyleRuleType,
  VirtualStyleRules,
} from '../src/document-browser';
import {
  applyVirtualStyleRulesToNode,
  createOrGetNode,
  diff,
} from '../src/diff';
import { INode, NodeType, serializedNodeWithId } from 'rrweb-snapshot/';

const elementSn = {
  type: NodeType.Element,
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

/**
 * Create a document tree or a RRDom tree according to the given ElementType data.
 *
 * @param treeNode the given data structure
 * @param rrDocument determine to generate a RRDom tree.
 */
function createTree(
  treeNode: ElementType,
  rrDocument?: RRDocument,
): INode | RRNode {
  let root: INode | RRNode;
  root = rrDocument
    ? rrDocument.createElement(treeNode.tagName)
    : ((document.createElement(treeNode.tagName) as unknown) as INode);
  root.__sn = Object.assign({}, elementSn, {
    tagName: treeNode.tagName,
    id: treeNode.id,
  });
  if (treeNode.children)
    for (let child of treeNode.children) {
      const childNode = createTree(child, rrDocument);
      if (rrDocument) (root as RRElement).appendChild(childNode as RRNode);
      else (root as INode).appendChild(childNode as Node);
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
  // An adhoc mirror just for unit tests.
  const mirror = {
    map: {},
    getId() {
      return 0;
    },
    getNode() {
      return null;
    },
    removeNodeFromMap() {},
    has(id: number) {
      return this.map.hasOwnProperty(id);
    },
    reset() {
      this.map = {};
    },
  };

  describe('diff properties', () => {
    it('add new properties', () => {
      const tagName = 'DIV';
      const node = (document.createElement(tagName) as unknown) as INode;
      node.__sn = Object.assign({}, elementSn, { tagName });
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      rrNode.__sn = Object.assign({}, elementSn, { tagName });
      rrNode.attributes = { id: 'node1', class: 'node' };
      diff(node, rrNode, mirror);
      expect(((node as unknown) as HTMLElement).id).toBe('node1');
      expect(((node as unknown) as HTMLElement).className).toBe('node');
    });

    it('update exist properties', () => {
      const tagName = 'DIV';
      const node = (document.createElement(tagName) as unknown) as INode;
      node.__sn = Object.assign({}, elementSn, { tagName });
      ((node as unknown) as HTMLElement).id = 'element1';
      ((node as unknown) as HTMLElement).className = 'element';
      ((node as unknown) as HTMLElement).setAttribute('style', 'color: black');
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      rrNode.__sn = Object.assign({}, elementSn, { tagName });
      rrNode.attributes = { id: 'node1', class: 'node', style: 'color: white' };
      diff(node, rrNode, mirror);
      expect(((node as unknown) as HTMLElement).id).toBe('node1');
      expect(((node as unknown) as HTMLElement).className).toBe('node');
      expect(((node as unknown) as HTMLElement).getAttribute('style')).toBe(
        'color: white',
      );

      rrNode.attributes = { id: 'node2' };
      diff(node, rrNode, mirror);
      expect(((node as unknown) as HTMLElement).id).toBe('node2');
      expect(((node as unknown) as HTMLElement).className).toBe('undefined');
      expect(((node as unknown) as HTMLElement).getAttribute('style')).toBe(
        'undefined',
      );
    });

    it('delete old properties', () => {
      const tagName = 'DIV';
      const node = (document.createElement(tagName) as unknown) as INode;
      node.__sn = Object.assign({}, elementSn, { tagName });
      ((node as unknown) as HTMLElement).id = 'element1';
      ((node as unknown) as HTMLElement).className = 'element';
      ((node as unknown) as HTMLElement).setAttribute('style', 'color: black');
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement(tagName);
      rrNode.__sn = Object.assign({}, elementSn, { tagName });
      rrNode.attributes = { id: 'node1' };
      diff(node, rrNode, mirror);
      expect(((node as unknown) as HTMLElement).id).toBe('node1');
      expect(((node as unknown) as HTMLElement).className).toBe('undefined');
      expect(((node as unknown) as HTMLElement).getAttribute('style')).toBe(
        'undefined',
      );

      rrNode.attributes = { src: 'link' };
      diff(node, rrNode, mirror);
      expect(((node as unknown) as HTMLElement).id).toBe('undefined');
      expect(((node as unknown) as HTMLElement).getAttribute('src')).toBe(
        'link',
      );
    });
  });

  describe('diff children', () => {
    it('append elements', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3]);
    });

    it('prepends elements', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [4, 5].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3, 4, 5]);
    });

    it('add elements in the middle', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 4, 5].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3, 4, 5]);
    });

    it('add elements at begin and end', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [2, 3, 4].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3, 4, 5]);
    });

    it('add children to parent with no children', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3]);
    });

    it('remove all children from parent', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3, 4].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
      expect(node.childNodes.length).toEqual(4);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(0);
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(0);
      expect(rrNode.childNodes.length).toEqual(0);
    });

    it('remove elements from the beginning', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
      expect(node.childNodes.length).toEqual(5);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3, 4, 5]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(3);
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([3, 4, 5]);
    });

    it('remove elements from end', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
      expect(node.childNodes.length).toEqual(5);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3, 4, 5]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 3].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(3);
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3]);
    });

    it('remove elements from the middle', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
      expect(node.childNodes.length).toEqual(5);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3, 4, 5]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [1, 2, 4, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(4);
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(4);
      expect(rrNode.childNodes.length).toEqual(4);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 4, 5]);
    });

    it('moves element forward', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
      expect(node.childNodes.length).toEqual(5);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3, 4, 5]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [2, 3, 4, 1, 5].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(5);
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([2, 3, 4, 1, 5]);
    });

    it('move elements to end', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
      expect(node.childNodes.length).toEqual(3);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 2, 3]);
      const rrNode = createTree(
        {
          tagName: 'p',
          id: 0,
          children: [2, 3, 1].map((c) => ({ tagName: 'span', id: c })),
        },
        new RRDocument(),
      ) as RRNode;
      expect(rrNode.childNodes.length).toEqual(3);
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(3);
      expect(rrNode.childNodes.length).toEqual(3);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([2, 3, 1]);
    });

    it('move element backwards', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3, 4].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(4);
      expect(rrNode.childNodes.length).toEqual(4);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([1, 4, 2, 3]);
    });

    it('swap first and last', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3, 4].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(4);
      expect(rrNode.childNodes.length).toEqual(4);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([4, 2, 3, 1]);
    });

    it('move to left and replace', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3, 4, 5].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(5);
      expect(rrNode.childNodes.length).toEqual(5);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([4, 1, 2, 3, 6]);
    });

    it('move to left and leaves hold', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 4, 5].map((c) => ({ tagName: 'span', id: c })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(2);
      expect(rrNode.childNodes.length).toEqual(2);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([4, 6]);
    });

    it('reverse elements', () => {
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: [1, 2, 3, 4, 5, 6, 7, 8].map((c) => ({
          tagName: 'span',
          id: c,
        })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(8);
      expect(rrNode.childNodes.length).toEqual(8);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
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
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: oldElementsIds.map((c) => ({
          tagName: 'span',
          id: c,
        })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(newElementsNum);
      expect(rrNode.childNodes.length).toEqual(newElementsNum);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual(newElementsIds);
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
      const node = createTree({
        tagName: 'p',
        id: 0,
        children: oldElementsIds.map((c) => ({
          tagName: 'span',
          id: c,
        })),
      }) as INode;
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
      diff(node, rrNode, mirror);
      expect(node.childNodes.length).toEqual(newElementsNum);
      expect(rrNode.childNodes.length).toEqual(newElementsNum);
      expect(
        Array.from(node.childNodes).map(
          (c) => ((c as unknown) as INode).__sn.id,
        ),
      ).toEqual(newElementsIds);
    });
  });

  describe('create or get a Node', () => {
    it('create a real HTML element from RRElement', () => {
      const rrDocument = new RRDocument();
      const rrNode = rrDocument.createElement('DIV');
      rrNode.__sn = Object.assign({}, elementSn, { id: 0 });
      let result = createOrGetNode(rrNode, mirror);
      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.__sn.id).toBe(0);
      expect(((result as unknown) as HTMLElement).tagName).toBe('DIV');
    });

    it('create a node from RRNode', () => {
      const rrDocument = new RRDocument();
      const textContent = 'Text Content';
      let rrNode: RRNode = rrDocument.createTextNode(textContent);
      rrNode.__sn = { id: 0, type: NodeType.Text, textContent };
      let result = createOrGetNode(rrNode, mirror);
      expect(result).toBeInstanceOf(Text);
      expect(result.__sn.id).toBe(0);
      expect(((result as unknown) as Text).textContent).toBe(textContent);

      rrNode = rrDocument.createComment(textContent);
      rrNode.__sn = { id: 0, type: NodeType.Comment, textContent };
      result = createOrGetNode(rrNode, mirror);
      expect(result).toBeInstanceOf(Comment);
      expect(result.__sn.id).toBe(0);
      expect(((result as unknown) as Comment).textContent).toBe(textContent);
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
    it.skip('should insert rule at index [0,0] and keep existing rules', () => {
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

      console.log(
        Array.from((styleEl.sheet?.cssRules[0] as CSSMediaRule).cssRules),
      );

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
