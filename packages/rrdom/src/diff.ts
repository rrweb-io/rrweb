import { INode, NodeType } from 'rrweb-snapshot';
import { RRElement, RRNode } from './document-browser';

export function diff(oldTree: INode, newTree: RRNode) {
  if (oldTree && newTree) {
    if (oldTree.__sn?.id === newTree.__sn?.id) {
      switch (newTree.nodeType) {
        case NodeType.Element:
          diffProps((oldTree as unknown) as HTMLElement, newTree as RRElement);
          break;
      }
      const oldChildren = oldTree.childNodes;
      const newChildren = newTree.childNodes;
      if (oldChildren.length > 0 || newChildren.length > 0) {
        diffChildren(
          (Array.from(oldChildren) as unknown) as INode[],
          newChildren,
          oldTree,
        );
      }
    } else if (oldTree.__sn?.id !== newTree.__sn?.id) {
      // Replace the old node with the new node
    } else if (oldTree.__sn?.id) {
    } else if (newTree.__sn?.id) {
    }
  } else if (oldTree) {
    if (oldTree.parentNode) oldTree.parentNode.removeChild(oldTree);
  } else if (newTree) {
    // TODO Create a new node.
  }
}

function diffProps(oldTree: HTMLElement, newTree: RRElement) {
  const oldAttributes = oldTree.attributes;
  const newAttributes = newTree.attributes;

  for (const { name, value } of Array.from(oldAttributes)) {
    if (!(name in newAttributes)) oldTree.removeAttribute(name);
    const newValue = newAttributes[name];
    if (value === newValue) continue;
    else oldTree.setAttribute(name, newValue as string);
  }

  for (let attribute in newAttributes) {
    const newValue = newAttributes[attribute];
    if (oldAttributes.hasOwnProperty(attribute)) continue;
    if (typeof newValue === 'boolean' || typeof newValue === 'number') {
      // TODO Some special cases for some kinds of elements. e.g. checked, rr_scrollLeft
    } else oldTree.setAttribute(attribute, newValue);
  }
}

function diffChildren(
  oldChildren: (INode | undefined)[],
  newChildren: RRNode[],
  parentNode: INode,
) {
  let oldStartIndex = 0,
    oldEndIndex = oldChildren.length - 1,
    newStartIndex = 0,
    newEndIndex = newChildren.length - 1;
  let oldStartNode = oldChildren[oldStartIndex],
    oldEndNode = oldChildren[oldEndIndex],
    newStartNode = newChildren[newStartIndex],
    newEndNode = newChildren[newEndIndex];
  let oldIdToIndex: Record<number, number> | undefined = undefined,
    indexInOld;
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    if (oldStartNode === undefined) {
      oldStartNode = oldChildren[++oldStartIndex];
    } else if (oldEndNode === undefined) {
      oldEndNode = oldChildren[--oldEndIndex];
    } else if (oldStartNode.__sn.id === newStartNode.__sn.id) {
      diff(oldStartNode, newStartNode);
      oldStartNode = oldChildren[++oldStartIndex];
      newStartNode = newChildren[++newStartIndex];
    } else if (oldEndNode.__sn.id === newEndNode.__sn.id) {
      diff(oldEndNode, newEndNode);
      oldEndNode = oldChildren[--oldEndIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (oldStartNode.__sn.id === newEndNode.__sn.id) {
      parentNode.insertBefore(oldStartNode, oldEndNode.nextSibling);
      diff(oldStartNode, newEndNode);
      oldStartNode = oldChildren[++oldStartIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (oldEndNode.__sn.id === newStartNode.__sn.id) {
      parentNode.insertBefore(oldEndNode, oldStartNode);
      diff(oldEndNode, newStartNode);
      oldEndNode = oldChildren[--oldEndIndex];
      newStartNode = newChildren[++newStartIndex];
    } else {
      if (!oldIdToIndex) {
        oldIdToIndex = {};
        for (let i = oldStartIndex; i <= oldEndIndex; i++)
          oldIdToIndex[oldChildren[i]!.__sn.id] = i;
      }
      indexInOld = oldIdToIndex[newStartNode.__sn.id];
      if (indexInOld) {
        const nodeToMove = oldChildren[indexInOld]!;
        parentNode.insertBefore(nodeToMove, oldStartNode);
        diff(nodeToMove, newStartNode);
        oldChildren[indexInOld] = undefined;
      } else {
        // TODO Create a new node.
      }
      newStartNode = newChildren[++newStartIndex];
    }
  }
  if (oldStartIndex > oldEndIndex) {
    // TODO Create several new nodes.
  } else if (newStartIndex > newEndIndex) {
    for (; oldStartIndex <= oldEndIndex; oldStartIndex++) {
      const node = oldChildren[oldStartIndex];
      node && parentNode.removeChild(node);
    }
  }
}
