/**
 * Some utils to handle the mutation observer DOM records.
 * It should be more clear to extend the native data structure
 * like Set and Map, but currently Typescript does not support
 * that.
 */

import { INode } from 'rrweb-snapshot';
import { removedNodeMutation } from '../types';
import { mirror } from '../utils';

export function deepDelete(addsSet: Set<Node>, n: Node) {
  addsSet.delete(n);
  n.childNodes.forEach(childN => deepDelete(addsSet, childN));
}

export function isParentRemoved(
  removes: removedNodeMutation[],
  n: Node,
): boolean {
  const { parentNode } = n;
  if (!parentNode) {
    return false;
  }
  const parentId = mirror.getId((parentNode as Node) as INode);
  if (removes.some(r => r.id === parentId)) {
    return true;
  }
  return isParentRemoved(removes, parentNode);
}

export function isParentDropped(droppedSet: Set<Node>, n: Node): boolean {
  const { parentNode } = n;
  if (!parentNode) {
    return false;
  }
  if (droppedSet.has(parentNode)) {
    return true;
  }
  return isParentDropped(droppedSet, parentNode);
}
