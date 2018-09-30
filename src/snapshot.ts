import {
  serializedNode,
  serializedNodeWithId,
  NodeType,
  attributes,
} from './types';

let _id = 1;

function genId(): number {
  return _id++;
}

function resetId() {
  _id = 1;
}

function serializeNode(n: Node): serializedNode | false {
  switch (n.nodeType) {
    case n.DOCUMENT_NODE:
      return {
        type: NodeType.Document,
        childNodes: [],
      };
    case n.DOCUMENT_TYPE_NODE:
      return {
        type: NodeType.DocumentType,
        name: (n as DocumentType).name,
        publicId: (n as DocumentType).publicId,
        systemId: (n as DocumentType).systemId,
      };
    case n.ELEMENT_NODE:
      const tagName = (n as HTMLElement).tagName.toLowerCase();
      const attributes: attributes = {};
      for (const { name, value } of Array.from((n as HTMLElement).attributes)) {
        attributes[name] = value;
      }
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select'
      ) {
        const value = (n as HTMLInputElement | HTMLTextAreaElement).value;
        if (
          attributes.type !== 'radio' &&
          attributes.type !== 'checkbox' &&
          value
        ) {
          attributes.value = value;
        } else if ((n as HTMLInputElement).checked) {
          attributes.checked = (n as HTMLInputElement).checked;
        }
      }
      if (tagName === 'option') {
        const selectValue = (n as HTMLOptionElement).parentElement;
        if (attributes.value === (selectValue as HTMLSelectElement).value) {
          attributes.selected = (n as HTMLOptionElement).selected;
        }
      }
      return {
        type: NodeType.Element,
        tagName,
        attributes,
        childNodes: [],
      };
    case n.TEXT_NODE:
      // The parent node may not be a html element which has a tagName attribute.
      // So just let it be undefined which is ok in this use case.
      const parentTagName =
        n.parentNode && (n.parentNode as HTMLElement).tagName;
      let textContent = (n as Text).textContent;
      if (parentTagName === 'SCRIPT') {
        textContent = '';
      }
      return {
        type: NodeType.Text,
        textContent,
      };
    case n.CDATA_SECTION_NODE:
      return {
        type: NodeType.CDATA,
        textContent: '',
      };
    case n.COMMENT_NODE:
      return {
        type: NodeType.Comment,
        textContent: (n as Comment).textContent,
      };
    default:
      return false;
  }
}

function _snapshot(n: Node): serializedNodeWithId | null {
  const _serializedNode = serializeNode(n);
  if (!_serializedNode) {
    // TODO: dev only
    console.warn(n, 'not serialized');
    return null;
  }
  const serializedNode: serializedNodeWithId = Object.assign(_serializedNode, {
    id: genId(),
  });
  if (
    serializedNode.type === NodeType.Document ||
    serializedNode.type === NodeType.Element
  ) {
    for (const childN of Array.from(n.childNodes)) {
      serializedNode.childNodes.push(_snapshot(childN));
    }
  }
  return serializedNode;
}

function snapshot(n: Node): serializedNodeWithId | null {
  resetId();
  return _snapshot(n);
}

export default snapshot;
