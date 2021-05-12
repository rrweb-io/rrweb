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
  [key: string]: string | number | boolean;
};
export type elementNode = {
  type: NodeType.Element;
  tagName: string;
  attributes: attributes;
  childNodes: serializedNodeWithId[];
  isSVG?: true;
  needBlock?: boolean;
};

export type textNode = {
  type: NodeType.Text;
  textContent: string;
  isStyle?: true;
};

export type cdataNode = {
  type: NodeType.CDATA;
  textContent: '';
};

export type commentNode = {
  type: NodeType.Comment;
  textContent: string;
};

export type serializedNode = (
  | documentNode
  | documentTypeNode
  | elementNode
  | textNode
  | cdataNode
  | commentNode
) & {
  rootId?: number;
  isShadowHost?: boolean;
  isShadow?: boolean;
};

export type serializedNodeWithId = serializedNode & { id: number };

export type tagMap = {
  [key: string]: string;
};

export interface INode extends Node {
  __sn: serializedNodeWithId;
}

export type idNodeMap = {
  [key: number]: INode;
};

export type MaskInputOptions = Partial<{
  color: boolean;
  date: boolean;
  'datetime-local': boolean;
  email: boolean;
  month: boolean;
  number: boolean;
  range: boolean;
  search: boolean;
  tel: boolean;
  text: boolean;
  time: boolean;
  url: boolean;
  week: boolean;
  // unify textarea and select element with text input
  textarea: boolean;
  select: boolean;
  password: boolean;
}>;

export type SlimDOMOptions = Partial<{
  script: boolean;
  comment: boolean;
  headFavicon: boolean;
  headWhitespace: boolean;
  headMetaDescKeywords: boolean;
  headMetaSocial: boolean;
  headMetaRobots: boolean;
  headMetaHttpEquiv: boolean;
  headMetaAuthorship: boolean;
  headMetaVerification: boolean;
}>;

export type MaskTextFn = (text: string) => string;
