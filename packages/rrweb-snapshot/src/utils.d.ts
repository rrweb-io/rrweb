import type { MaskInputFn, MaskInputOptions } from './types';
import type {
  IMirror,
  serializedNodeWithId,
  serializedNode,
} from '@newrelic/rrweb-types';
export declare function isElement(n: Node): n is Element;
export declare function isShadowRoot(n: Node): n is ShadowRoot;
export declare function isNativeShadowDom(shadowRoot: ShadowRoot): boolean;
declare interface CSSImportRule extends CSSRule {
  readonly href: string;
  readonly layerName: string | null;
  readonly media: MediaList;
  readonly styleSheet: CSSStyleSheet;
  readonly supportsText?: string | null;
}
export declare function escapeImportStatement(rule: CSSImportRule): string;
export declare function stringifyStylesheet(s: CSSStyleSheet): string | null;
export declare function stringifyRule(
  rule: CSSRule,
  sheetHref: string | null,
): string;
export declare function fixSafariColons(cssStringified: string): string;
export declare function isCSSImportRule(rule: CSSRule): rule is CSSImportRule;
export declare function isCSSStyleRule(rule: CSSRule): rule is CSSStyleRule;
export declare class Mirror implements IMirror<Node> {
  private idNodeMap;
  private nodeMetaMap;
  getId(n: Node | undefined | null): number;
  getNode(id: number): Node | null;
  getIds(): number[];
  getMeta(n: Node): serializedNodeWithId | null;
  removeNodeFromMap(n: Node): void;
  has(id: number): boolean;
  hasNode(node: Node): boolean;
  add(n: Node, meta: serializedNodeWithId): void;
  replace(id: number, n: Node): void;
  reset(): void;
}
export declare function createMirror(): Mirror;
export declare function maskInputValue({
  element,
  maskInputOptions,
  tagName,
  type,
  value,
  maskInputFn,
}: {
  element: HTMLElement;
  maskInputOptions: MaskInputOptions;
  tagName: string;
  type: string | null;
  value: string | null;
  maskInputFn?: MaskInputFn;
}): string;
export declare function toLowerCase<T extends string>(str: T): Lowercase<T>;
export declare function is2DCanvasBlank(canvas: HTMLCanvasElement): boolean;
export declare function isNodeMetaEqual(
  a: serializedNode,
  b: serializedNode,
): boolean;
export declare function getInputType(
  element: HTMLElement,
): Lowercase<string> | null;
export declare function extractFileExtension(
  path: string,
  baseURL?: string,
): string | null;
export declare function absolutifyURLs(
  cssText: string | null,
  href: string,
): string;
export declare function normalizeCssString(
  cssText: string,
  _testNoPxNorm?: boolean,
): string;
export declare function splitCssText(
  cssText: string,
  style: HTMLStyleElement,
  _testNoPxNorm?: boolean,
): string[];
export declare function markCssSplits(
  cssText: string,
  style: HTMLStyleElement,
): string;
export {};
