import { NodeType as RRNodeType } from '@newrelic/rrweb-types';
export interface IRRNode {
  parentElement: IRRNode | null;
  parentNode: IRRNode | null;
  ownerDocument: IRRDocument;
  readonly childNodes: IRRNode[];
  readonly ELEMENT_NODE: number;
  readonly TEXT_NODE: number;
  readonly nodeType: number;
  readonly nodeName: string;
  readonly RRNodeType: RRNodeType;
  firstChild: IRRNode | null;
  lastChild: IRRNode | null;
  previousSibling: IRRNode | null;
  nextSibling: IRRNode | null;
  textContent: string | null;
  contains(node: IRRNode): boolean;
  appendChild(newChild: IRRNode): IRRNode;
  insertBefore(newChild: IRRNode, refChild: IRRNode | null): IRRNode;
  removeChild(node: IRRNode): IRRNode;
  toString(): string;
}
export interface IRRDocument extends IRRNode {
  documentElement: IRRElement | null;
  body: IRRElement | null;
  head: IRRElement | null;
  implementation: IRRDocument;
  firstElementChild: IRRElement | null;
  readonly nodeName: '#document';
  compatMode: 'BackCompat' | 'CSS1Compat';
  createDocument(
    _namespace: string | null,
    _qualifiedName: string | null,
    _doctype?: DocumentType | null,
  ): IRRDocument;
  createDocumentType(
    qualifiedName: string,
    publicId: string,
    systemId: string,
  ): IRRDocumentType;
  createElement(tagName: string): IRRElement;
  createElementNS(_namespaceURI: string, qualifiedName: string): IRRElement;
  createTextNode(data: string): IRRText;
  createComment(data: string): IRRComment;
  createCDATASection(data: string): IRRCDATASection;
  open(): void;
  close(): void;
  write(content: string): void;
}
export interface IRRElement extends IRRNode {
  tagName: string;
  attributes: Record<string, string>;
  shadowRoot: IRRElement | null;
  scrollLeft?: number;
  scrollTop?: number;
  id: string;
  className: string;
  classList: ClassList;
  style: CSSStyleDeclaration;
  attachShadow(init: ShadowRootInit): IRRElement;
  getAttribute(name: string): string | null;
  setAttribute(name: string, attribute: string): void;
  setAttributeNS(
    namespace: string | null,
    qualifiedName: string,
    value: string,
  ): void;
  removeAttribute(name: string): void;
  dispatchEvent(event: Event): boolean;
}
export interface IRRDocumentType extends IRRNode {
  readonly name: string;
  readonly publicId: string;
  readonly systemId: string;
}
export interface IRRText extends IRRNode {
  readonly nodeName: '#text';
  data: string;
}
export interface IRRComment extends IRRNode {
  readonly nodeName: '#comment';
  data: string;
}
export interface IRRCDATASection extends IRRNode {
  readonly nodeName: '#cdata-section';
  data: string;
}
export declare abstract class BaseRRNode implements IRRNode {
  parentElement: IRRNode | null;
  parentNode: IRRNode | null;
  ownerDocument: IRRDocument;
  firstChild: IRRNode | null;
  lastChild: IRRNode | null;
  previousSibling: IRRNode | null;
  nextSibling: IRRNode | null;
  abstract textContent: string | null;
  readonly ELEMENT_NODE: number;
  readonly TEXT_NODE: number;
  readonly nodeType: number;
  readonly nodeName: string;
  readonly RRNodeType: RRNodeType;
  constructor(..._args: any[]);
  get childNodes(): IRRNode[];
  contains(node: IRRNode): boolean;
  appendChild(_newChild: IRRNode): IRRNode;
  insertBefore(_newChild: IRRNode, _refChild: IRRNode | null): IRRNode;
  removeChild(_node: IRRNode): IRRNode;
  toString(): string;
}
export declare class BaseRRDocument extends BaseRRNode implements IRRDocument {
  readonly nodeType: number;
  readonly nodeName: '#document';
  readonly compatMode: 'BackCompat' | 'CSS1Compat';
  readonly RRNodeType = RRNodeType.Document;
  textContent: string | null;
  constructor(...args: any[]);
  get documentElement(): IRRElement | null;
  get body(): IRRElement | null;
  get head(): IRRElement | null;
  get implementation(): IRRDocument;
  get firstElementChild(): IRRElement | null;
  appendChild(newChild: IRRNode): IRRNode;
  insertBefore(newChild: IRRNode, refChild: IRRNode | null): IRRNode;
  removeChild(node: IRRNode): IRRNode;
  open(): void;
  close(): void;
  write(content: string): void;
  createDocument(
    _namespace: string | null,
    _qualifiedName: string | null,
    _doctype?: DocumentType | null,
  ): IRRDocument;
  createDocumentType(
    qualifiedName: string,
    publicId: string,
    systemId: string,
  ): IRRDocumentType;
  createElement(tagName: string): IRRElement;
  createElementNS(_namespaceURI: string, qualifiedName: string): IRRElement;
  createTextNode(data: string): IRRText;
  createComment(data: string): IRRComment;
  createCDATASection(data: string): IRRCDATASection;
  toString(): string;
}
export declare class BaseRRDocumentType
  extends BaseRRNode
  implements IRRDocumentType
{
  readonly nodeType: number;
  readonly RRNodeType = RRNodeType.DocumentType;
  readonly nodeName: string;
  readonly name: string;
  readonly publicId: string;
  readonly systemId: string;
  textContent: string | null;
  constructor(qualifiedName: string, publicId: string, systemId: string);
  toString(): string;
}
export declare class BaseRRElement extends BaseRRNode implements IRRElement {
  readonly nodeType: number;
  readonly RRNodeType = RRNodeType.Element;
  readonly nodeName: string;
  tagName: string;
  attributes: Record<string, string>;
  shadowRoot: IRRElement | null;
  scrollLeft?: number;
  scrollTop?: number;
  constructor(tagName: string);
  get textContent(): string;
  set textContent(textContent: string);
  get classList(): ClassList;
  get id(): string;
  get className(): string;
  get style(): CSSStyleDeclaration;
  getAttribute(name: string): string | null;
  setAttribute(name: string, attribute: string): void;
  setAttributeNS(
    _namespace: string | null,
    qualifiedName: string,
    value: string,
  ): void;
  removeAttribute(name: string): void;
  appendChild(newChild: IRRNode): IRRNode;
  insertBefore(newChild: IRRNode, refChild: IRRNode | null): IRRNode;
  removeChild(node: IRRNode): IRRNode;
  attachShadow(_init: ShadowRootInit): IRRElement;
  dispatchEvent(_event: Event): boolean;
  toString(): string;
}
export declare class BaseRRMediaElement extends BaseRRElement {
  currentTime?: number;
  volume?: number;
  paused?: boolean;
  muted?: boolean;
  playbackRate?: number;
  loop?: boolean;
  attachShadow(_init: ShadowRootInit): IRRElement;
  play(): void;
  pause(): void;
}
export declare class BaseRRDialogElement extends BaseRRElement {
  readonly tagName: 'DIALOG';
  readonly nodeName: 'DIALOG';
  get isModal(): boolean;
  get open(): boolean;
  close(): void;
  show(): void;
  showModal(): void;
}
export declare class BaseRRText extends BaseRRNode implements IRRText {
  readonly nodeType: number;
  readonly nodeName: '#text';
  readonly RRNodeType = RRNodeType.Text;
  data: string;
  constructor(data: string);
  get textContent(): string;
  set textContent(textContent: string);
  toString(): string;
}
export declare class BaseRRComment extends BaseRRNode implements IRRComment {
  readonly nodeType: number;
  readonly nodeName: '#comment';
  readonly RRNodeType = RRNodeType.Comment;
  data: string;
  constructor(data: string);
  get textContent(): string;
  set textContent(textContent: string);
  toString(): string;
}
export declare class BaseRRCDATASection
  extends BaseRRNode
  implements IRRCDATASection
{
  readonly nodeName: '#cdata-section';
  readonly nodeType: number;
  readonly RRNodeType = RRNodeType.CDATA;
  data: string;
  constructor(data: string);
  get textContent(): string;
  set textContent(textContent: string);
  toString(): string;
}
export declare class ClassList {
  private onChange;
  classes: string[];
  constructor(
    classText?: string,
    onChange?: ((newClassText: string) => void) | undefined,
  );
  add: (...classNames: string[]) => void;
  remove: (...classNames: string[]) => void;
}
export type CSSStyleDeclaration = Record<string, string> & {
  setProperty: (
    name: string,
    value: string | null,
    priority?: string | null,
  ) => void;
  removeProperty: (name: string) => string;
};
export declare enum NodeType {
  PLACEHOLDER = 0,
  ELEMENT_NODE = 1,
  ATTRIBUTE_NODE = 2,
  TEXT_NODE = 3,
  CDATA_SECTION_NODE = 4,
  ENTITY_REFERENCE_NODE = 5,
  ENTITY_NODE = 6,
  PROCESSING_INSTRUCTION_NODE = 7,
  COMMENT_NODE = 8,
  DOCUMENT_NODE = 9,
  DOCUMENT_TYPE_NODE = 10,
  DOCUMENT_FRAGMENT_NODE = 11,
}
