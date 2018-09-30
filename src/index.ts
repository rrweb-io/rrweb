let _id = 1;

function genId(): number {
  return _id++;
}

enum NodeType {
  Document,
  DocumentType,
  Element,
  Text,
  CDATA,
  Comment,
}

type serializedNode =
  | documentNode
  | documentTypeNode
  | elementNode
  | textNode
  | cdataNode
  | commentNode;

type documentNode = {
  type: NodeType.Document;
  childNodes: serializedNode[];
};

type documentTypeNode = {
  type: NodeType.DocumentType;
  name: string;
  publicId: string;
  systemId: string;
};

type attributes = {
  [key: string]: string;
};
type elementNode = {
  type: NodeType.Element;
  tagName: string;
  attributes: attributes;
  childNodes: serializedNode[];
};

type textNode = {
  type: NodeType.Text;
  textContent: string;
};

type cdataNode = {
  type: NodeType.CDATA;
  textContent: '';
};

type commentNode = {
  type: NodeType.Comment;
  textContent: string;
};

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

type serializedNodeWithId = serializedNode & { id: number };

function snapshot(n: Node): serializedNodeWithId | null {
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
      serializedNode.childNodes.push(snapshot(childN));
    }
  }
  return serializedNode;
}

export default snapshot;
