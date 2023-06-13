import type { serializedNodeWithId, NodeType } from '@rrweb/types';

export type serializedElementNodeWithId = Extract<
  serializedNodeWithId,
  Record<'type', NodeType.Element>
>;

export type tagMap = {
  [key: string]: string;
};

/**
 * @deprecated
 */
export interface INode extends Node {
  __sn: serializedNodeWithId;
}

export interface ICanvas extends HTMLCanvasElement {
  __context: string;
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
