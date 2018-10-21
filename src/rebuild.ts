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

function buildNode(n: serializedNodeWithId, doc: Document): Node | null {
  switch (n.type) {
    case NodeType.Document:
      return doc.implementation.createDocument(null, '', null);
    case NodeType.DocumentType:
      return doc.implementation.createDocumentType(
        n.name,
        n.publicId,
        n.systemId,
      );
    case NodeType.Element:
      const tagName = getTagName(n);
      const node = doc.createElement(tagName);
      const extraChildIndexes: number[] = [];
      for (const name in n.attributes) {
        if (n.attributes.hasOwnProperty(name)) {
          let value = n.attributes[name];
          value = typeof value === 'boolean' ? '' : value;
          const isTextarea = tagName === 'textarea' && name === 'value';
          const isRemoteCss = tagName === 'style' && name === '_cssText';
          if (isTextarea || isRemoteCss) {
            const child = doc.createTextNode(value);
            // identify the extra child DOM we added when rebuild
            extraChildIndexes.push(node.childNodes.length);
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
      if (extraChildIndexes.length) {
        node.setAttribute(
          'data-extra-child-index',
          JSON.stringify(extraChildIndexes),
        );
      }
      return node;
    case NodeType.Text:
      return doc.createTextNode(n.textContent);
    case NodeType.CDATA:
      return doc.createCDATASection(n.textContent);
    case NodeType.Comment:
      return doc.createComment(n.textContent);
    default:
      return null;
  }
}

function rebuild(n: serializedNodeWithId, doc: Document): Node | null {
  const root = buildNode(n, doc);
  if (!root) {
    return null;
  }
  if (n.type === NodeType.Element) {
    (root as HTMLElement).setAttribute('data-rrid', String(n.id));
  }
  if (n.type === NodeType.Document || n.type === NodeType.Element) {
    for (const childN of n.childNodes) {
      const childNode = rebuild(childN, doc);
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
