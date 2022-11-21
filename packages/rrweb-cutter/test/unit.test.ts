import { NodeType, serializedNodeWithId } from 'rrweb-snapshot';
import { getTreeForId, getIdsInNode } from '../src';

describe('getIdsInNode', () => {
  it('should get id of node', () => {
    const node: serializedNodeWithId = {
      id: 1,
      type: NodeType.Element,
      tagName: 'div',
      attributes: {},
      childNodes: [
        {
          id: 2,
          type: NodeType.Element,
          tagName: 'div',
          attributes: {},
          childNodes: [],
        },
      ],
    };
    expect(getIdsInNode(node, [])).toEqual([1]);
  });

  it('should get id of node and children', () => {
    const node: serializedNodeWithId = {
      id: 1,
      type: NodeType.Element,
      tagName: 'div',
      attributes: {},
      childNodes: [
        {
          id: 2,
          type: NodeType.Element,
          tagName: 'div',
          attributes: {},
          childNodes: [],
        },
      ],
    };
    expect(getIdsInNode(node, [1])).toEqual([1, 2]);
  });

  it('should update keepIds with child ids', () => {
    const keepIds = [1];
    const node: serializedNodeWithId = {
      id: 1,
      type: NodeType.Element,
      tagName: 'div',
      attributes: {},
      childNodes: [
        {
          id: 2,
          type: NodeType.Element,
          tagName: 'div',
          attributes: {},
          childNodes: [],
        },
      ],
    };
    expect(getIdsInNode(node, keepIds)).toEqual([1, 2]);
    expect(keepIds).toEqual([1, 2]);
  });

  it('should force update empty keepIds with child ids', () => {
    const keepIds: number[] = [];
    const node: serializedNodeWithId = {
      id: 1,
      type: NodeType.Element,
      tagName: 'div',
      attributes: {},
      childNodes: [
        {
          id: 2,
          type: NodeType.Element,
          tagName: 'div',
          attributes: {},
          childNodes: [],
        },
      ],
    };
    expect(getIdsInNode(node, keepIds, true)).toEqual([1, 2]);
    expect(keepIds).toEqual([1, 2]);
  });

  it('should update keepIds with nested child ids', () => {
    const keepIds = [1];
    const node: serializedNodeWithId = {
      id: 1,
      type: NodeType.Element,
      tagName: 'div',
      attributes: {},
      childNodes: [
        {
          id: 2,
          type: NodeType.Element,
          tagName: 'div',
          attributes: {},
          childNodes: [
            {
              id: 3,
              type: NodeType.Element,
              tagName: 'div',
              attributes: {},
              childNodes: [],
            },
          ],
        },
      ],
    };
    expect(getIdsInNode(node, keepIds)).toEqual([1, 2, 3]);
    expect(keepIds).toEqual([1, 2, 3]);
  });
});

describe('getTreeForId', () => {
  it('should return parents id as part of tree', () => {
    const tree = getTreeForId(
      new Set([99]),
      {
        id: 1,
        type: NodeType.Element,
        tagName: 'div',
        attributes: {},
        childNodes: [
          {
            id: 2,
            type: NodeType.Element,
            tagName: 'div',
            attributes: {},
            childNodes: [
              {
                id: 99,
                type: NodeType.Text,
                textContent: 'hello world',
              },
            ],
          },
        ],
      },
      [],
    );
    console.log(tree);
    expect(tree).toEqual(new Set([1, 2, 99]));
  });
  it('should update keepIds with children of target id', () => {
    const keepIds = [1];
    const tree = getTreeForId(
      new Set([1]),
      {
        id: 1,
        type: NodeType.Element,
        tagName: 'div',
        attributes: {},
        childNodes: [
          {
            id: 2,
            type: NodeType.Element,
            tagName: 'div',
            attributes: {},
            childNodes: [
              {
                id: 99,
                type: NodeType.Text,
                textContent: 'hello world',
              },
            ],
          },
        ],
      },
      keepIds,
    );
    expect(tree).toEqual(new Set([1, 2, 99]));
    expect(keepIds).toEqual([1, 2, 99]);
  });
  it('should return parents id as part of tree 2', () => {
    const tree = getTreeForId(
      new Set([2]),
      {
        id: 1,
        type: NodeType.Element,
        tagName: 'div',
        attributes: {},
        childNodes: [
          {
            id: 2,
            type: NodeType.Element,
            tagName: 'div',
            attributes: {},
            childNodes: [
              {
                id: 99,
                type: NodeType.Text,
                textContent: 'hello world',
              },
            ],
          },
        ],
      },
      [],
    );
    console.log(tree);
    expect(tree).toEqual(new Set([1, 2]));
  });

  it('should return multiple parent ids as part of tree', () => {
    const tree = getTreeForId(
      new Set([98, 99]),
      {
        id: 1,
        type: NodeType.Element,
        tagName: 'div',
        attributes: {},
        childNodes: [
          {
            id: 2,
            type: NodeType.Element,
            tagName: 'div',
            attributes: {},
            childNodes: [
              {
                id: 98,
                type: NodeType.Text,
                textContent: 'hello world',
              },
            ],
          },
          {
            id: 3,
            type: NodeType.Element,
            tagName: 'div',
            attributes: {},
            childNodes: [
              {
                id: 99,
                type: NodeType.Text,
                textContent: 'hello world',
              },
            ],
          },
        ],
      },
      [],
    );
    console.log(tree);
    expect(tree).toEqual(new Set([1, 2, 98, 3, 99]));
  });
});
