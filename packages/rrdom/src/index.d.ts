import type { Mirror as NodeMirror } from '@newrelic/rrweb-snapshot';
import type {
  IMirror,
  serializedNodeWithId,
  canvasMutationData,
  canvasEventWithTime,
  inputData,
  scrollData,
  styleSheetRuleData,
  styleDeclarationData,
} from '@newrelic/rrweb-types';
import {
  BaseRRNode as RRNode,
  BaseRRCDATASection,
  BaseRRComment,
  BaseRRDocument,
  BaseRRDocumentType,
  BaseRRElement,
  BaseRRMediaElement,
  BaseRRText,
  type IRRDocument,
  type IRRElement,
  type IRRNode,
  BaseRRDialogElement,
} from './document';
export declare class RRDocument extends BaseRRDocument {
  private UNSERIALIZED_STARTING_ID;
  private _unserializedId;
  get unserializedId(): number;
  mirror: Mirror;
  scrollData: scrollData | null;
  constructor(mirror?: Mirror);
  createDocument(
    _namespace: string | null,
    _qualifiedName: string | null,
    _doctype?: DocumentType | null,
  ): RRDocument;
  createDocumentType(
    qualifiedName: string,
    publicId: string,
    systemId: string,
  ): BaseRRDocumentType;
  createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
  ): RRElementType<K>;
  createElement(tagName: string): RRElement;
  createComment(data: string): BaseRRComment;
  createCDATASection(data: string): BaseRRCDATASection;
  createTextNode(data: string): BaseRRText;
  destroyTree(): void;
  open(): void;
}
export declare const RRDocumentType: typeof BaseRRDocumentType;
export declare class RRElement extends BaseRRElement {
  inputData: inputData | null;
  scrollData: scrollData | null;
}
export declare class RRMediaElement extends BaseRRMediaElement {}
export declare class RRDialogElement extends BaseRRDialogElement {}
export declare class RRCanvasElement extends RRElement implements IRRElement {
  rr_dataURL: string | null;
  canvasMutations: {
    event: canvasEventWithTime;
    mutation: canvasMutationData;
  }[];
  getContext(): RenderingContext | null;
}
export declare class RRStyleElement extends RRElement {
  rules: (styleSheetRuleData | styleDeclarationData)[];
}
export declare class RRIFrameElement extends RRElement {
  contentDocument: RRDocument;
  constructor(upperTagName: string, mirror: Mirror);
}
export declare const RRText: typeof BaseRRText;
export type RRText = typeof RRText;
export declare const RRComment: typeof BaseRRComment;
export type RRComment = typeof RRComment;
export declare const RRCDATASection: typeof BaseRRCDATASection;
export type RRCDATASection = typeof RRCDATASection;
interface RRElementTagNameMap {
  audio: RRMediaElement;
  canvas: RRCanvasElement;
  iframe: RRIFrameElement;
  style: RRStyleElement;
  video: RRMediaElement;
}
type RRElementType<K extends keyof HTMLElementTagNameMap> =
  K extends keyof RRElementTagNameMap ? RRElementTagNameMap[K] : RRElement;
export declare function buildFromNode(
  node: Node,
  rrdom: IRRDocument,
  domMirror: NodeMirror,
  parentRRNode?: IRRNode | null,
): IRRNode | null;
export declare function buildFromDom(
  dom: Document,
  domMirror?: NodeMirror,
  rrdom?: IRRDocument,
): IRRDocument;
export declare function createMirror(): Mirror;
export declare class Mirror implements IMirror<RRNode> {
  private idNodeMap;
  private nodeMetaMap;
  getId(n: RRNode | undefined | null): number;
  getNode(id: number): RRNode | null;
  getIds(): number[];
  getMeta(n: RRNode): serializedNodeWithId | null;
  removeNodeFromMap(n: RRNode): void;
  has(id: number): boolean;
  hasNode(node: RRNode): boolean;
  add(n: RRNode, meta: serializedNodeWithId): void;
  replace(id: number, n: RRNode): void;
  reset(): void;
}
export declare function getDefaultSN(
  node: IRRNode,
  id: number,
): serializedNodeWithId;
export declare function printRRDom(
  rootNode: IRRNode,
  mirror: IMirror<IRRNode>,
): string;
export { RRNode };
export { diff, createOrGetNode, type ReplayerHandler } from './diff';
export * from './document';
