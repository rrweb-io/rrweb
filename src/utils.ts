import { INode } from './types';

export function isElement(n: Node | INode): n is Element {
  return n.nodeType === n.ELEMENT_NODE;
}
