import { NodeType, serializedNodeWithId } from 'rrweb-snapshot';
import { parseCSSText, camelize, toCSSText } from './style';

export type IRRDocument = IRRNode & {
  notSerializedId: number;

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

  createElementNS(
    _namespaceURI: 'http://www.w3.org/2000/svg',
    qualifiedName: string,
  ): IRRElement;

  createTextNode(data: string): IRRText;

  createComment(data: string): IRRComment;

  createCDATASection(data: string): IRRCDATASection;
};
export type IRRElement = IRRNode & {
  tagName: string;
  attributes: Record<string, string>;
  shadowRoot: IRRElement | null;
};
export type IRRDocumentType = IRRNode & {
  readonly name: string;
  readonly publicId: string;
  readonly systemId: string;
};
export type IRRText = IRRNode & {
  data: string;
};
export type IRRComment = IRRNode & {
  data: string;
};
export type IRRCDATASection = IRRNode & {
  data: string;
};

export abstract class IRRNode {
  __sn: serializedNodeWithId;
  children: IRRNode[] = [];
  parentElement: IRRNode | null = null;
  parentNode: IRRNode | null = null;
  ELEMENT_NODE = 1;
  TEXT_NODE = 3;
  // corresponding nodeType value of standard HTML Node
  readonly nodeType: number;
  readonly RRNodeType: NodeType;

  get childNodes(): IRRNode[] {
    return this.children;
  }

  get firstChild(): IRRNode | null {
    return this.childNodes[0] ?? null;
  }

  get nextSibling(): IRRNode | null {
    let parentNode = this.parentNode;
    if (!parentNode) return null;
    const siblings = parentNode.children;
    let index = siblings.indexOf(this);
    return siblings[index + 1] ?? null;
  }

  get textContent(): string | null {
    if (
      this.RRNodeType === NodeType.Text ||
      this.RRNodeType === NodeType.Comment ||
      this.RRNodeType === NodeType.CDATA
    )
      return ((this as unknown) as IRRText | IRRComment | IRRCDATASection).data;
    else if (this.RRNodeType === NodeType.Element) {
      let result = '';
      this.childNodes.forEach((node) => result + node.textContent);
      return result;
    } else return null;
  }

  set textContent(textContent: string | null) {
    textContent = textContent || '';

    if (
      this.RRNodeType === NodeType.Text ||
      this.RRNodeType === NodeType.Comment ||
      this.RRNodeType === NodeType.CDATA
    )
      ((this as unknown) as
        | IRRText
        | IRRComment
        | IRRCDATASection).data = textContent;
    else if (this.RRNodeType === NodeType.Element) {
      if (this.childNodes[0].RRNodeType === NodeType.Text)
        this.childNodes[0].textContent = textContent;
    }
  }

  contains(node: IRRNode) {
    if (node === this) return true;
    for (const child of this.children) {
      if (child.contains(node)) return true;
    }
    return false;
  }

  appendChild(_newChild: IRRNode): IRRNode {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  insertBefore(_newChild: IRRNode, _refChild: IRRNode | null): IRRNode {
    throw new Error(
      `RRDomException: Failed to execute 'insertBefore' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  removeChild(node: IRRNode) {
    const indexOfChild = this.children.indexOf(node);
    if (indexOfChild !== -1) {
      this.children.splice(indexOfChild, 1);
      node.parentElement = null;
      node.parentNode = null;
    }
  }

  toString(nodeName?: string) {
    return `${this.__sn?.id || ''} ${nodeName}`;
  }
}

export function BaseRRDocumentImpl(RRNodeClass: typeof IRRNode) {
  return class extends RRNodeClass implements IRRDocument {
    readonly nodeType = 9;
    readonly RRNodeType = NodeType.Document;
    _notSerializedId = -1; // used as an id to identify not serialized node

    /**
     * Every time the id is used, it will minus 1 automatically to avoid collisions.
     */
    get notSerializedId(): number {
      return this._notSerializedId--;
    }

    get documentElement(): IRRElement | null {
      return (
        (this.children.find(
          (node) =>
            node.RRNodeType === NodeType.Element &&
            (node as IRRElement).tagName === 'HTML',
        ) as IRRElement) || null
      );
    }

    get body(): IRRElement | null {
      return (
        (this.documentElement?.children.find(
          (node) =>
            node.RRNodeType === NodeType.Element &&
            (node as IRRElement).tagName === 'BODY',
        ) as IRRElement) || null
      );
    }

    get head(): IRRElement | null {
      return (
        (this.documentElement?.children.find(
          (node) =>
            node.RRNodeType === NodeType.Element &&
            (node as IRRElement).tagName === 'HEAD',
        ) as IRRElement) || null
      );
    }

    get implementation(): IRRDocument {
      return (this as unknown) as IRRDocument;
    }

    get firstElementChild(): IRRElement | null {
      return this.documentElement;
    }

    appendChild(childNode: IRRNode): IRRNode {
      const nodeType = childNode.RRNodeType;
      if (nodeType === NodeType.Element || nodeType === NodeType.DocumentType) {
        if (this.children.some((s) => s.RRNodeType === nodeType)) {
          throw new Error(
            `RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one ${
              nodeType === NodeType.Element ? 'RRElement' : 'RRDoctype'
            } on RRDocument allowed.`,
          );
        }
      }
      childNode.parentElement = null;
      childNode.parentNode = this;
      this.children.push(childNode);
      return childNode;
    }

    insertBefore(newChild: IRRNode, refChild: IRRNode | null): IRRNode {
      if (refChild === null) return this.appendChild(newChild);
      const childIndex = this.children.indexOf(refChild);
      if (childIndex == -1)
        throw new Error(
          "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.",
        );
      this.children.splice(childIndex, 0, newChild);
      newChild.parentElement = null;
      newChild.parentNode = this;
      return newChild;
    }

    open() {
      this.children = [];
    }

    close() {}

    /**
     * Adhoc implementation for setting xhtml namespace in rebuilt.ts (rrweb-snapshot).
     * There are two lines used this function:
     * 1. doc.write('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">')
     * 2. doc.write('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">')
     */
    write(content: string) {
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
        doctype.__sn = {
          type: NodeType.DocumentType,
          name: 'html',
          publicId: publicId,
          systemId: '',
          id: this.notSerializedId,
        };
        this.open();
        this.appendChild(doctype);
      }
    }

    createDocument(
      _namespace: string | null,
      _qualifiedName: string | null,
      _doctype?: DocumentType | null,
    ): IRRDocument {
      throw new Error('Method not implemented.');
    }

    createDocumentType(
      _qualifiedName: string,
      _publicId: string,
      _systemId: string,
    ): IRRDocumentType {
      throw new Error('Method not implemented.');
    }

    createElement(_tagName: string): IRRElement {
      throw new Error('Method not implemented.');
    }

    createElementNS(
      _namespaceURI: 'http://www.w3.org/2000/svg',
      _qualifiedName: string,
    ): IRRElement {
      throw new Error('Method not implemented.');
    }

    createTextNode(_data: string): IRRText {
      throw new Error('Method not implemented.');
    }

    createComment(_data: string): IRRComment {
      throw new Error('Method not implemented.');
    }

    createCDATASection(_data: string): IRRCDATASection {
      throw new Error('Method not implemented.');
    }

    toString() {
      return super.toString('RRDocument');
    }
  };
}

export function BaseRRDocumentTypeImpl(RRNodeClass: typeof IRRNode) {
  return class extends RRNodeClass {
    readonly nodeType = 10;
    readonly RRNodeType = NodeType.DocumentType;
    readonly name: string;
    readonly publicId: string;
    readonly systemId: string;

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

export function BaseRRElementImpl(RRNodeClass: typeof IRRNode) {
  return class BaseRRElementImpl extends RRNodeClass implements IRRElement {
    readonly nodeType = 1;
    readonly RRNodeType = NodeType.Element;
    tagName: string;
    attributes: Record<string, string> = {};
    shadowRoot: IRRElement | null = null;

    constructor(tagName: string) {
      super();
      this.tagName = tagName;
    }

    get classList() {
      return new ClassList(
        this.attributes.class as string | undefined,
        (newClassName) => {
          this.attributes.class = newClassName;
        },
      );
    }

    get id() {
      return this.attributes.id;
    }

    get className() {
      return this.attributes.class || '';
    }

    get style() {
      const style = (this.attributes.style
        ? parseCSSText(this.attributes.style as string)
        : {}) as Record<string, string> & {
        setProperty: (
          name: string,
          value: string | null,
          priority?: string | null,
        ) => void;
        removeProperty: (name: string) => string;
      };
      style.setProperty = (name: string, value: string | null) => {
        const normalizedName = camelize(name);
        if (!value) delete style[normalizedName];
        else style[normalizedName] = value;
        this.attributes.style = toCSSText(style);
      };
      style.removeProperty = (name: string) => {
        const normalizedName = camelize(name);
        const value = style[normalizedName] ?? '';
        delete style[normalizedName];
        return value;
      };
      return style;
    }

    getAttribute(name: string) {
      return this.attributes[name] ?? null;
    }

    setAttribute(name: string, attribute: string) {
      this.attributes[name] = attribute;
    }

    setAttributeNS(
      _namespace: string | null,
      qualifiedName: string,
      value: string,
    ): void {
      this.setAttribute(qualifiedName, value);
    }

    removeAttribute(name: string) {
      delete this.attributes[name];
    }

    appendChild(newChild: IRRNode): IRRNode {
      this.children.push(newChild);
      newChild.parentNode = this;
      newChild.parentElement = this;
      return newChild;
    }

    insertBefore(newChild: IRRNode, refChild: IRRNode | null): IRRNode {
      if (refChild === null) return this.appendChild(newChild);
      const childIndex = this.children.indexOf(refChild);
      if (childIndex == -1)
        throw new Error(
          "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.",
        );
      this.children.splice(childIndex, 0, newChild);
      newChild.parentElement = this;
      newChild.parentNode = this;
      return newChild;
    }

    dispatchEvent(_event: Event) {
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

export function BaseRRMediaElementImpl(
  RRElementClass: ReturnType<typeof BaseRRElementImpl>,
) {
  return class extends RRElementClass {
    public currentTime?: number;
    public volume?: number;
    public paused?: boolean;
    public muted?: boolean;
    attachShadow(_init: ShadowRootInit): IRRElement {
      throw new Error(
        `Uncaught DOMException: Failed to execute 'attachShadow' on 'RRElement': This RRElement does not support attachShadow`,
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

export function BaseRRTextImpl(RRNodeClass: typeof IRRNode) {
  return class extends RRNodeClass implements IRRText {
    readonly nodeType = 3;
    readonly RRNodeType = NodeType.Text;
    data: string;

    constructor(data: string) {
      super();
      this.data = data;
    }

    toString() {
      return `${super.toString('RRText')} text=${JSON.stringify(this.data)}`;
    }
  };
}

export function BaseRRCommentImpl(RRNodeClass: typeof IRRNode) {
  return class extends RRNodeClass implements IRRComment {
    readonly nodeType = 8;
    readonly RRNodeType = NodeType.Comment;
    data: string;

    constructor(data: string) {
      super();
      this.data = data;
    }

    toString() {
      return `${super.toString('RRComment')} text=${JSON.stringify(this.data)}`;
    }
  };
}

export function BaseRRCDATASectionImpl(RRNodeClass: typeof IRRNode) {
  // @ts-ignore
  return class extends RRNodeClass implements IRRCDATASection {
    readonly nodeType = 4;
    readonly RRNodeType = NodeType.CDATA;
    data: string;

    constructor(data: string) {
      super();
      this.data = data;
    }

    toString() {
      return `${super.toString('RRCDATASection')} data=${JSON.stringify(
        this.data,
      )}`;
    }
  };
}

export class ClassList extends Array {
  private onChange: ((newClassText: string) => void) | undefined;

  constructor(
    classText?: string,
    onChange?: ((newClassText: string) => void) | undefined,
  ) {
    super();
    if (classText) {
      const classes = classText.trim().split(/\s+/);
      super.push(...classes);
    }
    this.onChange = onChange;
  }

  add = (...classNames: string[]) => {
    for (const item of classNames) {
      const className = String(item);
      if (super.indexOf(className) >= 0) continue;
      super.push(className);
    }
    this.onChange && this.onChange(super.join(' '));
  };

  remove = (...classNames: string[]) => {
    for (const item of classNames) {
      const className = String(item);
      const index = super.indexOf(className);
      if (index < 0) continue;
      super.splice(index, 1);
    }
    this.onChange && this.onChange(super.join(' '));
  };
}
