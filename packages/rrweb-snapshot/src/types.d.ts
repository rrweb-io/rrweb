import type { serializedNodeWithId } from '@newrelic/rrweb-types';
export type tagMap = {
  [key: string]: string;
};
export type DialogAttributes = {
  open: string;
  rr_open_mode: 'modal' | 'non-modal';
};
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
  headTitleMutations: boolean;
}>;
export type MaskTextFn = (text: string, element: HTMLElement | null) => string;
export type MaskInputFn = (text: string, element: HTMLElement) => string;
export type KeepIframeSrcFn = (src: string) => boolean;
export type BuildCache = {
  stylesWithHoverClass: Map<string, string>;
};
