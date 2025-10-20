import type {
  MaskInputOptions,
  SlimDOMOptions,
  MaskTextFn,
  MaskInputFn,
  KeepIframeSrcFn,
} from './types';
import type {
  serializedNodeWithId,
  serializedElementNodeWithId,
  DataURLOptions,
} from '@newrelic/rrweb-types';
import { Mirror } from './utils';
export declare const IGNORED_NODE = -2;
export declare function genId(): number;
export declare function absoluteToDoc(
  doc: Document,
  attributeValue: string,
): string;
export declare function transformAttribute(
  doc: Document,
  tagName: Lowercase<string>,
  name: Lowercase<string>,
  value: string | null,
): string | null;
export declare function ignoreAttribute(
  tagName: string,
  name: string,
  _value: unknown,
): boolean;
export declare function _isBlockedElement(
  element: HTMLElement,
  blockClass: string | RegExp,
  blockSelector: string | null,
): boolean;
export declare function classMatchesRegex(
  node: Node | null,
  regex: RegExp,
  checkAncestors: boolean,
): boolean;
export declare function needMaskingText(
  node: Node,
  maskTextClass: string | RegExp,
  maskTextSelector: string | null,
  checkAncestors: boolean,
): boolean;
export declare function serializeNodeWithId(
  n: Node,
  options: {
    doc: Document;
    mirror: Mirror;
    blockClass: string | RegExp;
    blockSelector: string | null;
    maskTextClass: string | RegExp;
    maskTextSelector: string | null;
    skipChild: boolean;
    inlineStylesheet: boolean;
    newlyAddedElement?: boolean;
    maskInputOptions?: MaskInputOptions;
    needsMask?: boolean;
    maskTextFn: MaskTextFn | undefined;
    maskInputFn: MaskInputFn | undefined;
    slimDOMOptions: SlimDOMOptions;
    dataURLOptions?: DataURLOptions;
    keepIframeSrcFn?: KeepIframeSrcFn;
    inlineImages?: boolean;
    recordCanvas?: boolean;
    preserveWhiteSpace?: boolean;
    onSerialize?: (n: Node) => unknown;
    onIframeLoad?: (
      iframeNode: HTMLIFrameElement,
      node: serializedElementNodeWithId,
    ) => unknown;
    iframeLoadTimeout?: number;
    onStylesheetLoad?: (
      linkNode: HTMLLinkElement,
      node: serializedElementNodeWithId,
    ) => unknown;
    stylesheetLoadTimeout?: number;
    cssCaptured?: boolean;
  },
): serializedNodeWithId | null;
declare function snapshot(
  n: Document,
  options?: {
    mirror?: Mirror;
    blockClass?: string | RegExp;
    blockSelector?: string | null;
    maskTextClass?: string | RegExp;
    maskTextSelector?: string | null;
    inlineStylesheet?: boolean;
    maskAllInputs?: boolean | MaskInputOptions;
    maskTextFn?: MaskTextFn;
    maskInputFn?: MaskInputFn;
    slimDOM?: 'all' | boolean | SlimDOMOptions;
    dataURLOptions?: DataURLOptions;
    inlineImages?: boolean;
    recordCanvas?: boolean;
    preserveWhiteSpace?: boolean;
    onSerialize?: (n: Node) => unknown;
    onIframeLoad?: (
      iframeNode: HTMLIFrameElement,
      node: serializedElementNodeWithId,
    ) => unknown;
    iframeLoadTimeout?: number;
    onStylesheetLoad?: (
      linkNode: HTMLLinkElement,
      node: serializedElementNodeWithId,
    ) => unknown;
    stylesheetLoadTimeout?: number;
    keepIframeSrcFn?: KeepIframeSrcFn;
  },
): serializedNodeWithId | null;
export declare function visitSnapshot(
  node: serializedNodeWithId,
  onVisit: (node: serializedNodeWithId) => unknown,
): void;
export declare function cleanupSnapshot(): void;
export default snapshot;
