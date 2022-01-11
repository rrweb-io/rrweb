import { RRIframeElement, RRNode } from '../src/document-nodejs';

/**
 * Print the RRDom as a string.
 * @param rootNode the root node of the RRDom tree
 * @returns printed string
 */
export function printRRDom(rootNode: RRNode) {
  return walk(rootNode, '');
}

function walk(node: RRNode, blankSpace: string) {
  let printText = `${blankSpace}${node.toString()}\n`;
  for (const child of node.childNodes)
    printText += walk(child, blankSpace + '  ');
  if (node instanceof RRIframeElement)
    printText += walk(node.contentDocument, blankSpace + '  ');
  return printText;
}
