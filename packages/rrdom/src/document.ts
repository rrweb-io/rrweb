import {
  IMirror,
  NodeType as RRNodeType,
  serializedNodeWithId,
} from 'rrweb-snapshot';
import { parseCSSText, camelize, toCSSText } from './style';
export interface IRRNode {
  __sn: serializedNodeWithId;
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

  /**
   * @deprecated
   * Set a default value for RRNode's __sn property.
   * @param id the serialized id to assign
   */
  setDefaultSN(id: number): void;

  /**
   * Get a default value for RRNode's mirror.
   * @param id the serialized id to assign
   */
  getDefaultSN(id: number): serializedNodeWithId;

  toString(nodeName?: string): string;
}
export interface IRRDocument extends IRRNode {
  mirror: Mirror;

  unserializedId: number;

  documentElement: IRRElement | null;

  body: IRRElement | null;

  head: IRRElement | null;

  implementation: IRRDocument;

  firstElementChild: IRRElement | null;

  nodeName: '#document';

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
  nodeName: '#text';
  data: string;
}
export interface IRRComment extends IRRNode {
  nodeName: '#comment';
  data: string;
}
export interface IRRCDATASection extends IRRNode {
  nodeName: '#cdata-section';
  data: string;
}

type ConstrainedConstructor<T = {}> = new (...args: any[]) => T;

/**
 * This is designed as an abstract class so it should never be instantiated.
 */
export class BaseRRNode implements IRRNode {
  public __sn: serializedNodeWithId;
  public childNodes: IRRNode[] = [];
  public parentElement: IRRNode | null = null;
  public parentNode: IRRNode | null = null;
  public textContent: string | null;
  public ownerDocument: IRRDocument;
  public readonly ELEMENT_NODE: number = NodeType.ELEMENT_NODE;
  public readonly TEXT_NODE: number = NodeType.TEXT_NODE;
  // corresponding nodeType value of standard HTML Node
  public readonly nodeType: number;
  public readonly nodeName: string;
  public readonly RRNodeType: RRNodeType;

  constructor(...args: any[]) {}

  public get firstChild(): IRRNode | null {
    return this.childNodes[0] || null;
  }

  public get lastChild(): IRRNode | null {
    return this.childNodes[this.childNodes.length - 1] || null;
  }

  public get nextSibling(): IRRNode | null {
    let parentNode = this.parentNode;
    if (!parentNode) return null;
    const siblings = parentNode.childNodes;
    let index = siblings.indexOf(this);
    return siblings[index + 1] || null;
  }

  public contains(node: IRRNode) {
    if (node === this) return true;
    for (const child of this.childNodes) {
      if (child.contains(node)) return true;
    }
    return false;
  }

  public appendChild(_newChild: IRRNode): IRRNode {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  public insertBefore(_newChild: IRRNode, _refChild: IRRNode | null): IRRNode {
    throw new Error(
      `RRDomException: Failed to execute 'insertBefore' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  public removeChild(node: IRRNode): IRRNode {
    throw new Error(
      `RRDomException: Failed to execute 'removeChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  public getDefaultSN(id: number): serializedNodeWithId {
    switch (this.RRNodeType) {
      case RRNodeType.Document:
        return {
          id,
          type: this.RRNodeType,
          childNodes: [],
        };
      case RRNodeType.DocumentType:
        const doctype = (this as unknown) as IRRDocumentType;
        return {
          id,
          type: this.RRNodeType,
          name: doctype.name,
          publicId: doctype.publicId,
          systemId: doctype.systemId,
        };
      case RRNodeType.Element:
        return {
          id,
          type: this.RRNodeType,
          tagName: ((this as unknown) as IRRElement).tagName.toLowerCase(), // In rrweb data, all tagNames are lowercase.
          attributes: {},
          childNodes: [],
        };
      case RRNodeType.Text:
        return {
          id,
          type: this.RRNodeType,
          textContent: ((this as unknown) as IRRText).textContent || '',
        };
      case RRNodeType.Comment:
        return {
          id,
          type: this.RRNodeType,
          textContent: ((this as unknown) as IRRComment).textContent || '',
        };
      case RRNodeType.CDATA:
        return {
          id,
          type: this.RRNodeType,
          textContent: '',
        };
    }
  }

  // @deprecated
  public setDefaultSN(id: number) {
    this.__sn = this.getDefaultSN(id);
  }

  public toString(nodeName: string) {
    return `${this.__sn?.id || ''} ${nodeName}`;
  }
}

export function BaseRRDocumentImpl<
  RRNode extends ConstrainedConstructor<IRRNode>
>(RRNodeClass: RRNode) {
  return class BaseRRDocument extends RRNodeClass implements IRRDocument {
    public mirror: Mirror = createMirror();
    public readonly nodeType: number = NodeType.DOCUMENT_NODE;
    public readonly nodeName: '#document' = '#document';
    public readonly compatMode: 'BackCompat' | 'CSS1Compat' = 'CSS1Compat';
    public readonly RRNodeType = RRNodeType.Document;
    public textContent: string | null = null;
    // In the rrweb replayer, there are some unserialized nodes like the element that stores the injected style rules.
    // These unserialized nodes may interfere the execution of the diff algorithm.
    // The id of serialized node is larger than 0. So this value ​​less than 0 is used as id for these unserialized nodes.
    _unserializedId = -1;

    /**
     * Every time the id is used, it will minus 1 automatically to avoid collisions.
     */
    public get unserializedId(): number {
      return this._unserializedId--;
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
      this._unserializedId = -1;
    }

    public close() {}

    /**
     * Adhoc implementation for setting xhtml namespace in rebuilt.ts (rrweb-snapshot).
     * There are two lines used this function:
     * 1. doc.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">')
     * 2. doc.write('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">')
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
        setDefaultSN(doctype, this.unserializedId, this.mirror);
        this.open();
        this.appendChild(doctype);
      }
    }

    createDocument(
      _namespace: string | null,
      _qualifiedName: string | null,
      _doctype?: DocumentType | null,
    ): IRRDocument {
      return new BaseRRDocument();
    }

    createDocumentType(
      qualifiedName: string,
      publicId: string,
      systemId: string,
    ): IRRDocumentType {
      const doctype = new (BaseRRDocumentTypeImpl(BaseRRNode))(
        qualifiedName,
        publicId,
        systemId,
      );
      doctype.ownerDocument = this;
      return doctype;
    }

    createElement(tagName: string): IRRElement {
      const element = new (BaseRRElementImpl(BaseRRNode))(tagName);
      element.ownerDocument = this;
      return element;
    }

    createElementNS(_namespaceURI: string, qualifiedName: string): IRRElement {
      return this.createElement(qualifiedName);
    }

    createTextNode(data: string): IRRText {
      const text = new (BaseRRTextImpl(BaseRRNode))(data);
      text.ownerDocument = this;
      return text;
    }

    createComment(data: string): IRRComment {
      const comment = new (BaseRRCommentImpl(BaseRRNode))(data);
      comment.ownerDocument = this;
      return comment;
    }

    createCDATASection(data: string): IRRCDATASection {
      const CDATASection = new (BaseRRCDATASectionImpl(BaseRRNode))(data);
      CDATASection.ownerDocument = this;
      return CDATASection;
    }

    toString() {
      return super.toString('RRDocument');
    }
  };
}

export function BaseRRDocumentTypeImpl<
  RRNode extends ConstrainedConstructor<IRRNode>
>(RRNodeClass: RRNode) {
  // @ts-ignore
  return class BaseRRDocumentType
    extends RRNodeClass
    implements IRRDocumentType {
    public readonly nodeType: number = NodeType.DOCUMENT_TYPE_NODE;
    public readonly RRNodeType = RRNodeType.DocumentType;
    public readonly name: string;
    public readonly publicId: string;
    public readonly systemId: string;
    public textContent: string | null = null;

    constructor(qualifiedName: string, publicId: string, systemId: string) {
      super();
      this.name = qualifiedName;
      this.publicId = publicId;
      this.systemId = systemId;
    }

    toString() {
      return super.toString('RRDocumentType');
    }
  };
}

export function BaseRRElementImpl<
  RRNode extends ConstrainedConstructor<IRRNode>
>(RRNodeClass: RRNode) {
  // @ts-ignore
  return class BaseRRElement extends RRNodeClass implements IRRElement {
    public readonly nodeType: number = NodeType.ELEMENT_NODE;
    public readonly RRNodeType = RRNodeType.Element;
    public readonly nodeName: string;
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
        ? parseCSSText(this.attributes.style as string)
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

    public attachShadow(_init: ShadowRootInit): IRRElement {
      const shadowRoot = this.ownerDocument.createElement('SHADOWROOT');
      this.shadowRoot = shadowRoot;
      return shadowRoot;
    }

    public dispatchEvent(_event: Event) {
      return true;
    }

    toString() {
      let attributeString = '';
      for (let attribute in this.attributes) {
        attributeString += `${attribute}="${this.attributes[attribute]}" `;
      }
      return `${super.toString(this.tagName)} ${attributeString}`;
    }
  };
}

export function BaseRRMediaElementImpl<
  RRElement extends ConstrainedConstructor<IRRElement>
>(RRElementClass: RRElement) {
  return class BaseRRMediaElement extends RRElementClass {
    public currentTime?: number;
    public volume?: number;
    public paused?: boolean;
    public muted?: boolean;
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
  };
}

export function BaseRRTextImpl<RRNode extends ConstrainedConstructor<IRRNode>>(
  RRNodeClass: RRNode,
) {
  // @ts-ignore
  return class BaseRRText extends RRNodeClass implements IRRText {
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
      return `${super.toString('RRText')} text=${JSON.stringify(this.data)}`;
    }
  };
}

export function BaseRRCommentImpl<
  RRNode extends ConstrainedConstructor<IRRNode>
>(RRNodeClass: RRNode) {
  // @ts-ignore
  return class BaseRRComment extends RRNodeClass implements IRRComment {
    public readonly nodeType: number = NodeType.COMMENT_NODE;
    public readonly nodeName: '#comment' = '#comment';
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
      return `${super.toString('RRComment')} text=${JSON.stringify(this.data)}`;
    }
  };
}

export function BaseRRCDATASectionImpl<
  RRNode extends ConstrainedConstructor<IRRNode>
>(RRNodeClass: RRNode) {
  // @ts-ignore
  return class BaseRRCDATASection
    extends RRNodeClass
    implements IRRCDATASection {
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
      return `${super.toString('RRCDATASection')} data=${JSON.stringify(
        this.data,
      )}`;
    }
  };
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

export function createMirror(): Mirror {
  return new Mirror();
}

// based on Mirror from rrweb-snapshots
export class Mirror implements IMirror<BaseRRNode> {
  private idNodeMap: Map<number, BaseRRNode> = new Map();
  private nodeMetaMap: WeakMap<
    BaseRRNode,
    serializedNodeWithId
  > = new WeakMap();

  getId(n: BaseRRNode | undefined | null): number {
    if (!n) return -1;

    const id = this.getMeta(n)?.id;

    // if n is not a serialized Node, use -1 as its id.
    return id ?? -1;
  }

  getNode(id: number): BaseRRNode | null {
    return this.idNodeMap.get(id) || null;
  }

  getIds(): number[] {
    return Array.from(this.idNodeMap.keys());
  }

  getMeta(n: BaseRRNode): serializedNodeWithId | null {
    return this.nodeMetaMap.get(n) || null;
  }

  // removes the node from idNodeMap
  // doesn't remove the node from nodeMetaMap
  removeNodeFromMap(n: BaseRRNode) {
    const id = this.getId(n);
    this.idNodeMap.delete(id);

    if (n.childNodes) {
      n.childNodes.forEach((childNode) =>
        this.removeNodeFromMap((childNode as unknown) as BaseRRNode),
      );
    }
  }
  has(id: number): boolean {
    return this.idNodeMap.has(id);
  }

  hasNode(node: BaseRRNode): boolean {
    return this.nodeMetaMap.has(node);
  }

  add(n: BaseRRNode, meta: serializedNodeWithId) {
    const id = meta.id;
    this.idNodeMap.set(id, n);
    this.nodeMetaMap.set(n, meta);
  }

  replace(id: number, n: BaseRRNode) {
    this.idNodeMap.set(id, n);
  }

  reset() {
    this.idNodeMap = new Map();
    this.nodeMetaMap = new WeakMap();
  }
}

export function setDefaultSN(node: IRRNode, id: number, mirror: Mirror) {
  const sn = node.getDefaultSN(id);
  node.setDefaultSN(id); // DEPRECATED
  mirror.add(node, sn);
}
