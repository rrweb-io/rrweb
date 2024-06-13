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
  compatMode?: string;
};

export type documentTypeNode = {
  type: NodeType.DocumentType;
  name: string;
  publicId: string;
  systemId: string;
};

export type attributes = {
  [key: string]: string | number | true | null;
};
export type legacyAttributes = {
  /**
   * @deprecated old bug in rrweb was causing these to always be set
   * @see https://github.com/rrweb-io/rrweb/pull/651
   */
  selected: false;
};

export type elementNode = {
  type: NodeType.Element;
  tagName: string;
  attributes: attributes;
  childNodes: serializedNodeWithId[];
  isSVG?: true;
  needBlock?: boolean;
  // This is a custom element or not.
  isCustom?: true;
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

export type serializedElementNodeWithId = Extract<
  serializedNodeWithId,
  Record<'type', NodeType.Element>
>;

export type tagMap = {
  [key: string]: string;
};

export type mediaAttributes = {
  rr_mediaState: 'played' | 'paused';
  rr_mediaCurrentTime: number;
  /**
   * for backwards compatibility this is optional but should always be set
   */
  rr_mediaPlaybackRate?: number;
  /**
   * for backwards compatibility this is optional but should always be set
   */
  rr_mediaMuted?: boolean;
  /**
   * for backwards compatibility this is optional but should always be set
   */
  rr_mediaLoop?: boolean;
  /**
   * for backwards compatibility this is optional but should always be set
   */
  rr_mediaVolume?: number;
};

// @deprecated
export interface INode extends Node {
  __sn: serializedNodeWithId;
}

export interface ICanvas extends HTMLCanvasElement {
  __context: string;
}

export interface IMirror<TNode> {
  getId(n: TNode | undefined | null): number;

  getNode(id: number): TNode | null;

  getIds(): number[];

  getMeta(n: TNode): serializedNodeWithId | null;

  removeNodeFromMap(n: TNode): void;

  has(id: number): boolean;

  hasNode(node: TNode): boolean;

  add(n: TNode, meta: serializedNodeWithId): void;

  replace(id: number, n: TNode): void;

  reset(): void;
}

export type idNodeMap = Map<number, Node>;

export type nodeMetaMap = WeakMap<Node, serializedNodeWithId>;

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
  /**
   * blocks title tag 'animations' which can generate a lot of mutations that aren't usually displayed in replayers
   **/
  headTitleMutations: boolean;
}>;

export type DataURLOptions = Partial<{
  type: string;
  quality: number;
}>;

export type MaskTextFn = (text: string, element: HTMLElement | null) => string;
export type MaskInputFn = (text: string, element: HTMLElement) => string;

export type KeepIframeSrcFn = (src: string) => boolean;

export type BuildCache = {
  stylesWithHoverClass: Map<string, string>;
};
