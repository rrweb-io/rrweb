import { NodeType as RRNodeType } from 'rrweb-snapshot';
import { parseCSSText, camelize, toCSSText } from './style';
export interface IRRNode {
  parentElement: IRRNode | null;
  parentNode: IRRNode | null;
  childNodes: IRRNode[];
  ownerDocument: IRRDocument;
  readonly ELEMENT_NODE: number;
  readonly TEXT_NODE: number;
  // corresponding nodeType value of standard HTML Node
  readonly nodeType: number;
  readonly nodeName: string; // https://dom.spec.whatwg.org/#dom-node-nodename
  readonly RRNodeType: RRNodeType;

  firstChild: IRRNode | null;

  lastChild: IRRNode | null;

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

type ConstrainedConstructor<T = Record<string, unknown>> = new (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => T;

/**
 * This is designed as an abstract class so it should never be instantiated.
 */
export abstract class BaseRRNode implements IRRNode {
  public childNodes: IRRNode[] = [];
  public parentElement: IRRNode | null = null;
  public parentNode: IRRNode | null = null;
  public abstract textContent: string | null;
  public ownerDocument: IRRDocument;
  public readonly ELEMENT_NODE: number = NodeType.ELEMENT_NODE;
  public readonly TEXT_NODE: number = NodeType.TEXT_NODE;
  // corresponding nodeType value of standard HTML Node
  public readonly nodeType: number;
  public readonly nodeName: string;
  public readonly RRNodeType: RRNodeType;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  constructor(..._args: any[]) {
    //
  }

  public get firstChild(): IRRNode | null {
    return this.childNodes[0] || null;
  }

  public get lastChild(): IRRNode | null {
    return this.childNodes[this.childNodes.length - 1] || null;
  }

  public get nextSibling(): IRRNode | null {
    const parentNode = this.parentNode;
    if (!parentNode) return null;
    const siblings = parentNode.childNodes;
    const index = siblings.indexOf(this);
    return siblings[index + 1] || null;
  }

  public contains(node: IRRNode) {
    if (node === this) return true;
    for (const child of this.childNodes) {
      if (child.contains(node)) return true;
    }
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public appendChild(_newChild: IRRNode): IRRNode {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public insertBefore(_newChild: IRRNode, _refChild: IRRNode | null): IRRNode {
    throw new Error(
      `RRDomException: Failed to execute 'insertBefore' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public removeChild(_node: IRRNode): IRRNode {
    throw new Error(
      `RRDomException: Failed to execute 'removeChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  public toString(): string {
    return 'RRNode';
  }
}

export class BaseRRDocument extends BaseRRNode implements IRRDocument {
  public readonly nodeType: number = NodeType.DOCUMENT_NODE;
  public readonly nodeName: '#document' = '#document';
  public readonly compatMode: 'BackCompat' | 'CSS1Compat' = 'CSS1Compat';
  public readonly RRNodeType = RRNodeType.Document;
  public textContent: string | null = null;

  public get documentElement(): IRRElement | null {
    return (
      (this.childNodes.find(
        (node) =>
          node.RRNodeType === RRNodeType.Element &&
          (node as IRRElement).tagName === 'HTML',
      ) as IRRElement) || null
    );
  }

  public get body(): IRRElement | null {
    return (
      (this.documentElement?.childNodes.find(
        (node) =>
          node.RRNodeType === RRNodeType.Element &&
          (node as IRRElement).tagName === 'BODY',
      ) as IRRElement) || null
    );
  }

  public get head(): IRRElement | null {
    return (
      (this.documentElement?.childNodes.find(
        (node) =>
          node.RRNodeType === RRNodeType.Element &&
          (node as IRRElement).tagName === 'HEAD',
      ) as IRRElement) || null
    );
  }

  public get implementation(): IRRDocument {
    return this;
  }

  public get firstElementChild(): IRRElement | null {
    return this.documentElement;
  }

  public appendChild(childNode: IRRNode): IRRNode {
    const nodeType = childNode.RRNodeType;
    if (
      nodeType === RRNodeType.Element ||
      nodeType === RRNodeType.DocumentType
    ) {
      if (this.childNodes.some((s) => s.RRNodeType === nodeType)) {
        throw new Error(
          `RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one ${
            nodeType === RRNodeType.Element ? 'RRElement' : 'RRDoctype'
          } on RRDocument allowed.`,
        );
      }
    }
    childNode.parentElement = null;
    childNode.parentNode = this;
    this.childNodes.push(childNode);
    return childNode;
  }

  public insertBefore(newChild: IRRNode, refChild: IRRNode | null): IRRNode {
    const nodeType = newChild.RRNodeType;
    if (
      nodeType === RRNodeType.Element ||
      nodeType === RRNodeType.DocumentType
    ) {
      if (this.childNodes.some((s) => s.RRNodeType === nodeType)) {
        throw new Error(
          `RRDomException: Failed to execute 'insertBefore' on 'RRNode': Only one ${
            nodeType === RRNodeType.Element ? 'RRElement' : 'RRDoctype'
          } on RRDocument allowed.`,
        );
      }
    }
    if (refChild === null) return this.appendChild(newChild);
    const childIndex = this.childNodes.indexOf(refChild);
    if (childIndex == -1)
      throw new Error(
        "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.",
      );
    this.childNodes.splice(childIndex, 0, newChild);
    newChild.parentElement = null;
    newChild.parentNode = this;
    return newChild;
  }

  public removeChild(node: IRRNode) {
    const indexOfChild = this.childNodes.indexOf(node);
    if (indexOfChild === -1)
      throw new Error(
        "Failed to execute 'removeChild' on 'RRDocument': The RRNode to be removed is not a child of this RRNode.",
      );
    this.childNodes.splice(indexOfChild, 1);
    node.parentElement = null;
    node.parentNode = null;
    return node;
  }

  public open() {
    this.childNodes = [];
  }

  public close() {
    //
  }

  /**
   * Adhoc implementation for setting xhtml namespace in rebuilt.ts (rrweb-snapshot).
   * There are two lines used this function:
   * 1. doc.write('\<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ""\>')
   * 2. doc.write('\<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" ""\>')
   */
  public write(content: string) {
    let publicId;
    if (
      content ===
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">'
    )
      publicId = '-//W3C//DTD XHTML 1.0 Transitional//EN';
    else if (
      content ===
      '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">'
    )
      publicId = '-//W3C//DTD HTML 4.0 Transitional//EN';
    if (publicId) {
      const doctype = this.createDocumentType('html', publicId, '');
      this.open();
      this.appendChild(doctype);
    }
  }

  createDocument(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _namespace: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _qualifiedName: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _doctype?: DocumentType | null,
  ): IRRDocument {
    return new BaseRRDocument();
  }

  createDocumentType(
    qualifiedName: string,
    publicId: string,
    systemId: string,
  ): IRRDocumentType {
    const doctype = new BaseRRDocumentType(qualifiedName, publicId, systemId);
    doctype.ownerDocument = this;
    return doctype;
  }

  createElement(tagName: string): IRRElement {
    const element = new BaseRRElement(tagName);
    element.ownerDocument = this;
    return element;
  }

  createElementNS(_namespaceURI: string, qualifiedName: string): IRRElement {
    return this.createElement(qualifiedName);
  }

  createTextNode(data: string): IRRText {
    const text = new BaseRRText(data);
    text.ownerDocument = this;
    return text;
  }

  createComment(data: string): IRRComment {
    const comment = new BaseRRComment(data);
    comment.ownerDocument = this;
    return comment;
  }

  createCDATASection(data: string): IRRCDATASection {
    const CDATASection = new BaseRRCDATASection(data);
    CDATASection.ownerDocument = this;
    return CDATASection;
  }

  toString() {
    return 'RRDocument';
  }
}

export class BaseRRDocumentType extends BaseRRNode implements IRRDocumentType {
  public readonly nodeType: number = NodeType.DOCUMENT_TYPE_NODE;
  public readonly RRNodeType = RRNodeType.DocumentType;
  public readonly nodeName: string;
  public readonly name: string;
  public readonly publicId: string;
  public readonly systemId: string;
  public textContent: string | null = null;

  constructor(qualifiedName: string, publicId: string, systemId: string) {
    super();
    this.name = qualifiedName;
    this.publicId = publicId;
    this.systemId = systemId;
    this.nodeName = qualifiedName;
  }

  toString() {
    return 'RRDocumentType';
  }
}

export class BaseRRElement extends BaseRRNode implements IRRElement {
  public readonly nodeType: number = NodeType.ELEMENT_NODE;
  public readonly RRNodeType = RRNodeType.Element;
  public readonly nodeName: string;
  public tagName: string;
  public attributes: Record<string, string> = {};
  public shadowRoot: IRRElement | null = null;
  public scrollLeft?: number;
  public scrollTop?: number;

  constructor(...args: any[]) {
    if (typeof args[0] !== 'string')
      throw new Error('RRDOM: tag name must be a string.');
    const tagName = args[0];
    super();
    this.tagName = this.nodeName = tagName.toUpperCase();
  }

  public get textContent(): string {
    let result = '';
    this.childNodes.forEach((node) => (result += node.textContent));
    return result;
  }

  public set textContent(textContent: string) {
    this.childNodes = [this.ownerDocument.createTextNode(textContent)];
  }

  public get classList(): ClassList {
    return new ClassList(
      this.attributes.class as string | undefined,
      (newClassName) => {
        this.attributes.class = newClassName;
      },
    );
  }

  public get id() {
    return this.attributes.id || '';
  }

  public get className() {
    return this.attributes.class || '';
  }

  public get style() {
    const style = (this.attributes.style
      ? parseCSSText(this.attributes.style)
      : {}) as CSSStyleDeclaration;
    const hyphenateRE = /\B([A-Z])/g;
    style.setProperty = (
      name: string,
      value: string | null,
      priority?: string,
    ) => {
      if (hyphenateRE.test(name)) return;
      const normalizedName = camelize(name);
      if (!value) delete style[normalizedName];
      else style[normalizedName] = value;
      if (priority === 'important') style[normalizedName] += ' !important';
      this.attributes.style = toCSSText(style);
    };
    style.removeProperty = (name: string) => {
      if (hyphenateRE.test(name)) return '';
      const normalizedName = camelize(name);
      const value = style[normalizedName] || '';
      delete style[normalizedName];
      this.attributes.style = toCSSText(style);
      return value;
    };
    return style;
  }

  public getAttribute(name: string) {
    return this.attributes[name] || null;
  }

  public setAttribute(name: string, attribute: string) {
    this.attributes[name] = attribute;
  }

  public setAttributeNS(
    _namespace: string | null,
    qualifiedName: string,
    value: string,
  ): void {
    this.setAttribute(qualifiedName, value);
  }

  public removeAttribute(name: string) {
    delete this.attributes[name];
  }

  public appendChild(newChild: IRRNode): IRRNode {
    this.childNodes.push(newChild);
    newChild.parentNode = this;
    newChild.parentElement = this;
    return newChild;
  }

  public insertBefore(newChild: IRRNode, refChild: IRRNode | null): IRRNode {
    if (refChild === null) return this.appendChild(newChild);
    const childIndex = this.childNodes.indexOf(refChild);
    if (childIndex == -1)
      throw new Error(
        "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.",
      );
    this.childNodes.splice(childIndex, 0, newChild);
    newChild.parentElement = this;
    newChild.parentNode = this;
    return newChild;
  }

  public removeChild(node: IRRNode): IRRNode {
    const indexOfChild = this.childNodes.indexOf(node);
    if (indexOfChild === -1)
      throw new Error(
        "Failed to execute 'removeChild' on 'RRElement': The RRNode to be removed is not a child of this RRNode.",
      );
    this.childNodes.splice(indexOfChild, 1);
    node.parentElement = null;
    node.parentNode = null;
    return node;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public attachShadow(_init: ShadowRootInit): IRRElement {
    const shadowRoot = this.ownerDocument.createElement('SHADOWROOT');
    this.shadowRoot = shadowRoot;
    return shadowRoot;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public dispatchEvent(_event: Event) {
    return true;
  }

  toString() {
    let attributeString = '';
    for (const attribute in this.attributes) {
      attributeString += `${attribute}="${this.attributes[attribute]}" `;
    }
    return `${this.tagName} ${attributeString}`;
  }
}

export class BaseRRMediaElement extends BaseRRElement {
  public currentTime?: number;
  public volume?: number;
  public paused?: boolean;
  public muted?: boolean;
  public playbackRate?: number;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  attachShadow(_init: ShadowRootInit): IRRElement {
    throw new Error(
      `RRDomException: Failed to execute 'attachShadow' on 'RRElement': This RRElement does not support attachShadow`,
    );
  }
  public play() {
    this.paused = false;
  }
  public pause() {
    this.paused = true;
  }
}

export class BaseRRText extends BaseRRNode implements IRRText {
  public readonly nodeType: number = NodeType.TEXT_NODE;
  public readonly nodeName: '#text' = '#text';
  public readonly RRNodeType = RRNodeType.Text;
  public data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }

  public get textContent(): string {
    return this.data;
  }

  public set textContent(textContent: string) {
    this.data = textContent;
  }

  toString() {
    return `RRText text=${JSON.stringify(this.data)}`;
  }
}

export class BaseRRComment extends BaseRRNode implements IRRComment {
  public readonly nodeType: number = NodeType.COMMENT_NODE;
  public readonly nodeName: '#comment' = '#comment';
  public readonly RRNodeType = RRNodeType.Comment;
  public data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }
  parentElement: IRRNode | null;
  parentNode: IRRNode | null;
  childNodes: IRRNode[] = [];
  ownerDocument: IRRDocument;
  ELEMENT_NODE: number;
  TEXT_NODE: number;
  contains(node: IRRNode): boolean {
    throw new Error('Method not implemented.');
  }
  appendChild(newChild: IRRNode): IRRNode {
    throw new Error('Method not implemented.');
  }
  insertBefore(newChild: IRRNode, refChild: IRRNode | null): IRRNode {
    throw new Error('Method not implemented.');
  }
  removeChild(node: IRRNode): IRRNode {
    throw new Error('Method not implemented.');
  }

  public get textContent(): string {
    return this.data;
  }

  public set textContent(textContent: string) {
    this.data = textContent;
  }

  toString() {
    return `RRComment text=${JSON.stringify(this.data)}`;
  }
}

export class BaseRRCDATASection extends BaseRRNode implements IRRCDATASection {
  public readonly nodeName: '#cdata-section' = '#cdata-section';
  public readonly nodeType: number = NodeType.CDATA_SECTION_NODE;
  public readonly RRNodeType = RRNodeType.CDATA;
  public data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }

  public get textContent(): string {
    return this.data;
  }

  public set textContent(textContent: string) {
    this.data = textContent;
  }

  toString() {
    return `RRCDATASection data=${JSON.stringify(this.data)}`;
  }
}
export class ClassList {
  private onChange: ((newClassText: string) => void) | undefined;
  classes: string[] = [];

  constructor(
    classText?: string,
    onChange?: ((newClassText: string) => void) | undefined,
  ) {
    if (classText) {
      const classes = classText.trim().split(/\s+/);
      this.classes.push(...classes);
    }
    this.onChange = onChange;
  }

  add = (...classNames: string[]) => {
    for (const item of classNames) {
      const className = String(item);
      if (this.classes.indexOf(className) >= 0) continue;
      this.classes.push(className);
    }
    this.onChange && this.onChange(this.classes.join(' '));
  };

  remove = (...classNames: string[]) => {
    this.classes = this.classes.filter(
      (item) => classNames.indexOf(item) === -1,
    );
    this.onChange && this.onChange(this.classes.join(' '));
  };
}

export type CSSStyleDeclaration = Record<string, string> & {
  setProperty: (
    name: string,
    value: string | null,
    priority?: string | null,
  ) => void;
  removeProperty: (name: string) => string;
};

// Enumerate nodeType value of standard HTML Node.
export enum NodeType {
  PLACEHOLDER, // This isn't a node type. Enum type value starts from zero but NodeType value starts from 1.
  ELEMENT_NODE,
  ATTRIBUTE_NODE,
  TEXT_NODE,
  CDATA_SECTION_NODE,
  ENTITY_REFERENCE_NODE,
  ENTITY_NODE,
  PROCESSING_INSTRUCTION_NODE,
  COMMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_TYPE_NODE,
  DOCUMENT_FRAGMENT_NODE,
}
