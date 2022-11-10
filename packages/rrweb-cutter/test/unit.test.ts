import { NodeType } from 'rrweb-snapshot';
import { getTreeForId } from '../src';

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
