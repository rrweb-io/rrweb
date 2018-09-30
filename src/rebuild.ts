import { serializedNodeWithId, NodeType } from './types';

function buildNode(n: serializedNodeWithId): Node | null {
  switch (n.type) {
    case NodeType.Document:
      return document.implementation.createDocument(null, '', null);
    case NodeType.DocumentType:
      return document.implementation.createDocumentType(
        n.name,
        n.publicId,
        n.systemId,
      );
    case NodeType.Element:
      const node = document.createElement(n.tagName);
      for (const name in n.attributes) {
        if (n.attributes.hasOwnProperty(name)) {
          try {
            node.setAttribute(name, n.attributes[name]);
          } catch (error) {
            // skip invalid attribute
          }
        }
      }
      return node;
    case NodeType.Text:
      return document.createTextNode(n.textContent);
    case NodeType.CDATA:
      return document.createCDATASection(n.textContent);
    case NodeType.Comment:
      return document.createComment(n.textContent);
    default:
      return null;
  }
}

function rebuild(n: serializedNodeWithId): Node | null {
  const root = buildNode(n);
  if (!root) {
    return null;
  }
  if (n.type === NodeType.Document || n.type === NodeType.Element) {
    for (const childN of n.childNodes) {
      const childNode = rebuild(childN);
      root.appendChild(childNode);
    }
  }
  return root;
}

export default rebuild;
