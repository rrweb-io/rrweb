import { NodeType as RRNodeType } from '@saola.ai/rrweb-snapshot';
import { parseCSSText, camelize, toCSSText } from './style';
export interface IRRNode {
  parentElement: IRRNode | null;
  parentNode: IRRNode | null;
  ownerDocument: IRRDocument;
  readonly childNodes: IRRNode[];
  readonly ELEMENT_NODE: number;
  readonly TEXT_NODE: number;
  // corresponding nodeType value of standard HTML Node
  readonly nodeType: number;
  readonly nodeName: string; // https://dom.spec.whatwg.org/#dom-node-nodename
  readonly RRNodeType: RRNodeType;

  firstChild: IRRNode | null;

  lastChild: IRRNode | null;

  previousSibling: IRRNode | null;

  nextSibling: IRRNode | null;

  // If the node is a document or a doctype, textContent returns null.
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

/**
 * This is designed as an abstract class so it should never be instantiated.
 */
export abstract class BaseRRNode implements IRRNode {
  public parentElement: IRRNode | null = null;
  public parentNode: IRRNode | null = null;
  public ownerDocument!: IRRDocument;
  public firstChild: IRRNode | null = null;
  public lastChild: IRRNode | null = null;
  public previousSibling: IRRNode | null = null;
  public nextSibling: IRRNode | null = null;

  public abstract textContent: string | null;

  public readonly ELEMENT_NODE: number = NodeType.ELEMENT_NODE;
  public readonly TEXT_NODE: number = NodeType.TEXT_NODE;
  // corresponding nodeType value of standard HTML Node
  public readonly nodeType!: number;
  public readonly nodeName!: string;
  public readonly RRNodeType!: RRNodeType;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  constructor(..._args: any[]) {
    //
  }

  public get childNodes(): IRRNode[] {
    const childNodes: IRRNode[] = [];
    let childIterator: IRRNode | null = this.firstChild;
    while (childIterator) {
      childNodes.push(childIterator);
      childIterator = childIterator.nextSibling;
    }
    return childNodes;
  }

  public contains(node: IRRNode) {
    if (!(node instanceof BaseRRNode)) return false;
    else if (node.ownerDocument !== this.ownerDocument) return false;
    else if (node === this) return true;

    while (node.parentNode) {
      if (node.parentNode === this) return true;
      node = node.parentNode;
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
  public readonly nodeName = '#document' as const;
  public readonly compatMode: 'BackCompat' | 'CSS1Compat' = 'CSS1Compat';
  public readonly RRNodeType = RRNodeType.Document;
  public textContent: string | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(...args: any[]) {
    super(args);
    this.ownerDocument = this;
  }

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

  public appendChild(newChild: IRRNode): IRRNode {
    const nodeType = newChild.RRNodeType;
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

    const child = appendChild(this, newChild);
    child.parentElement = null;
    return child;
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

    const child = insertBefore(this, newChild, refChild);
    child.parentElement = null;
    return child;
  }

  public removeChild(node: IRRNode): IRRNode {
    return removeChild(this, node);
  }

  public open() {
    this.firstChild = null;
    this.lastChild = null;
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
  declare readonly nodeName: string;
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
  declare readonly nodeName: string;
  public tagName: string;
  public attributes: Record<string, string> = {};
  public shadowRoot: IRRElement | null = null;
  public scrollLeft?: number;
  public scrollTop?: number;

  constructor(tagName: string) {
    super();
    this.tagName = tagName.toUpperCase();
    this.nodeName = tagName.toUpperCase();
  }

  public get textContent(): string {
    let result = '';
    this.childNodes.forEach((node) => (result += node.textContent));
    return result;
  }

  public set textContent(textContent: string) {
    this.firstChild = null;
    this.lastChild = null;
    this.appendChild(this.ownerDocument.createTextNode(textContent));
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
    const style = (
      this.attributes.style ? parseCSSText(this.attributes.style) : {}
    ) as CSSStyleDeclaration;
    const hyphenateRE = /\B([A-Z])/g;
    style.setProperty = (
      name: string,
      value: string | null,
      priority?: string | null,
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

  public getAttribute(name: string): string | null {
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
    return appendChild(this, newChild);
  }

  public insertBefore(newChild: IRRNode, refChild: IRRNode | null): IRRNode {
    return insertBefore(this, newChild, refChild);
  }

  public removeChild(node: IRRNode): IRRNode {
    return removeChild(this, node);
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
  public loop?: boolean;
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
  public readonly nodeName = '#text' as const;
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
  public readonly nodeName = '#comment' as const;
  public readonly RRNodeType = RRNodeType.Comment;
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
    return `RRComment text=${JSON.stringify(this.data)}`;
  }
}

export class BaseRRCDATASection extends BaseRRNode implements IRRCDATASection {
  public readonly nodeName = '#cdata-section' as const;
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

function appendChild(parent: IRRNode, newChild: IRRNode) {
  if (newChild.parentNode) newChild.parentNode.removeChild(newChild);

  if (parent.lastChild) {
    parent.lastChild.nextSibling = newChild;
    newChild.previousSibling = parent.lastChild;
  } else {
    parent.firstChild = newChild;
    newChild.previousSibling = null;
  }
  parent.lastChild = newChild;
  newChild.nextSibling = null;
  newChild.parentNode = parent;
  newChild.parentElement = parent;
  newChild.ownerDocument = parent.ownerDocument;
  return newChild;
}

function insertBefore(
  parent: IRRNode,
  newChild: IRRNode,
  refChild: IRRNode | null,
) {
  if (!refChild) return appendChild(parent, newChild);

  if (refChild.parentNode !== parent)
    throw new Error(
      "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.",
    );

  if (newChild === refChild) return newChild;
  if (newChild.parentNode) newChild.parentNode.removeChild(newChild);

  newChild.previousSibling = refChild.previousSibling;
  refChild.previousSibling = newChild;
  newChild.nextSibling = refChild;

  if (newChild.previousSibling) newChild.previousSibling.nextSibling = newChild;
  else parent.firstChild = newChild;

  newChild.parentElement = parent;
  newChild.parentNode = parent;
  newChild.ownerDocument = parent.ownerDocument;
  return newChild;
}

function removeChild(parent: IRRNode, child: IRRNode) {
  if (child.parentNode !== parent)
    throw new Error(
      "Failed to execute 'removeChild' on 'RRNode': The RRNode to be removed is not a child of this RRNode.",
    );
  if (child.previousSibling)
    child.previousSibling.nextSibling = child.nextSibling;
  else parent.firstChild = child.nextSibling;
  if (child.nextSibling)
    child.nextSibling.previousSibling = child.previousSibling;
  else parent.lastChild = child.previousSibling;
  child.previousSibling = null;
  child.nextSibling = null;
  child.parentElement = null;
  child.parentNode = null;
  return child;
}

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
