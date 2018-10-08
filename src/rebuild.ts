import { serializedNodeWithId, NodeType, tagMap, elementNode } from './types';

const tagMap: tagMap = {
  script: 'noscript',
};
function getTagName(n: elementNode): string {
  let tagName = tagMap[n.tagName] ? tagMap[n.tagName] : n.tagName;
  if (tagName === 'link' && n.attributes._cssText) {
    tagName = 'style';
  }
  return tagName;
}

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
      const tagName = getTagName(n);
      const node = document.createElement(tagName);
      for (const name in n.attributes) {
        if (n.attributes.hasOwnProperty(name)) {
          let value = n.attributes[name];
          value = typeof value === 'boolean' ? '' : value;
          const isTextarea = tagName === 'textarea' && name === 'value';
          const isRemoteCss = tagName === 'style' && name === '_cssText';
          if (isTextarea || isRemoteCss) {
            const child = document.createTextNode(value);
            node.appendChild(child);
            continue;
          }
          try {
            node.setAttribute(name, value);
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
      if (!childNode) {
        console.warn('Failed to rebuild', childN);
      } else {
        root.appendChild(childNode);
      }
    }
  }
  return root;
}

export default rebuild;
