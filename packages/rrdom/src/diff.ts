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
      if (oldChildren.length > 0 && newChildren.length > 0) {
        diffChildren(
          (Array.from(oldChildren) as unknown) as INode[],
          newChildren,
        );
      } else if (oldChildren.length > 0) {
        // TODO Remove all children.
      } else if (newChildren.length > 0) {
        // TODO Add all new children.
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

function diffChildren(oldChildren: INode[], newChildren: RRNode[]) {
  // TODO
}
