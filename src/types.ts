export enum NodeType {
  Document,
  DocumentType,
  Element,
  Text,
  CDATA,
  Comment,
}

export type documentNode = {
  type: NodeType.Document;
  childNodes: serializedNodeWithId[];
};

export type documentTypeNode = {
  type: NodeType.DocumentType;
  name: string;
  publicId: string;
  systemId: string;
};

export type attributes = {
  [key: string]: string;
};
export type elementNode = {
  type: NodeType.Element;
  tagName: string;
  attributes: attributes;
  childNodes: serializedNodeWithId[];
};

export type textNode = {
  type: NodeType.Text;
  textContent: string;
};

export type cdataNode = {
  type: NodeType.CDATA;
  textContent: '';
};

export type commentNode = {
  type: NodeType.Comment;
  textContent: string;
};

export type serializedNode =
  | documentNode
  | documentTypeNode
  | elementNode
  | textNode
  | cdataNode
  | commentNode;

export type serializedNodeWithId = serializedNode & { id: number };
