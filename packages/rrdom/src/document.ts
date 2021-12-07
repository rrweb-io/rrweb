import { INode, NodeType, serializedNodeWithId } from 'rrweb-snapshot';
// @ts-ignore
import nwsapi, { NWSAPI } from 'nwsapi';
import * as nwsapiFactory from 'nwsapi';
import { parseCSSText, camelize, toCSSText } from './style';

export abstract class RRNode {
  __sn: serializedNodeWithId | undefined;
  children: Array<RRNode> = [];
  parentElement: RRElement | null = null;
  parentNode: RRNode | null = null;
  ownerDocument: RRDocument | null = null;
  ELEMENT_NODE = 1;
  TEXT_NODE = 3;

  get firstChild() {
    return this.children[0];
  }

  get nodeType() {
    if (this instanceof RRDocument) return NodeType.Document;
    if (this instanceof RRDocumentType) return NodeType.DocumentType;
    if (this instanceof RRElement) return NodeType.Element;
    if (this instanceof RRText) return NodeType.Text;
    if (this instanceof RRCDATASection) return NodeType.CDATA;
    if (this instanceof RRComment) return NodeType.Comment;
  }

  get childNodes() {
    return this.children;
  }

  appendChild(newChild: RRNode): RRNode {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  insertBefore(newChild: RRNode, refChild: RRNode | null): RRNode {
    throw new Error(
      `RRDomException: Failed to execute 'insertBefore' on 'RRNode': This RRNode type does not support this method.`,
    );
  }

  contains(node: RRNode) {
    if (node === this) return true;
    for (const child of this.children) {
      if (child.contains(node)) return true;
    }
    return false;
  }

  removeChild(node: RRNode) {
    const indexOfChild = this.children.indexOf(node);
    if (indexOfChild !== -1) {
      this.children.splice(indexOfChild, 1);
      node.parentElement = null;
      node.parentNode = null;
    }
  }

  toString(nodeName?: string) {
    return `${JSON.stringify(this.__sn?.id) || ''} ${nodeName}`;
  }
}

export class RRWindow {
  scrollLeft = 0;
  scrollTop = 0;
  scrollTo(options?: ScrollToOptions) {
    if (!options) return;
    if (typeof options.left === 'number') this.scrollLeft = options.left;
    if (typeof options.top === 'number') this.scrollTop = options.top;
  }
}

export class RRDocument extends RRNode {
  private mirror: Map<number, RRNode> = new Map();
  private _nwsapi: NWSAPI;
  get nwsapi() {
    if (!this._nwsapi) {
      this._nwsapi = (nwsapi || nwsapiFactory)({
        document: (this as unknown) as Document,
        DOMException: (null as unknown) as new (
          message?: string,
          name?: string,
        ) => DOMException,
      });
      this._nwsapi.configure({
        LOGERRORS: false,
        IDS_DUPES: true,
        MIXEDCASE: true,
      });
    }
    return this._nwsapi;
  }

  get documentElement(): RRElement {
    return this.children.filter(
      (node) => node instanceof RRElement && node.tagName === 'HTML',
    )[0] as RRElement;
  }

  get body() {
    return (
      this.documentElement?.children.filter(
        (node) => node instanceof RRElement && node.tagName === 'BODY',
      )[0] || null
    );
  }

  get head() {
    return (
      this.documentElement?.children.filter(
        (node) => node instanceof RRElement && node.tagName === 'HEAD',
      )[0] || null
    );
  }

  get implementation() {
    return this;
  }

  get firstElementChild() {
    return this.documentElement;
  }

  appendChild(childNode: RRNode) {
    const nodeType = childNode.nodeType;
    if (nodeType === NodeType.Element || nodeType === NodeType.DocumentType) {
      if (this.children.some((s) => s.nodeType === nodeType)) {
        throw new Error(
          `RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one ${
            nodeType === NodeType.Element ? 'RRElement' : 'RRDoctype'
          } on RRDocument allowed.`,
        );
      }
    }
    childNode.parentElement = null;
    childNode.parentNode = this;
    childNode.ownerDocument = this;
    this.children.push(childNode);
    return childNode;
  }

  insertBefore(newChild: RRNode, refChild: RRNode | null) {
    if (refChild === null) return this.appendChild(newChild);
    const childIndex = this.children.indexOf(refChild);
    if (childIndex == -1)
      throw new Error(
        "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.",
      );
    this.children.splice(childIndex, 0, newChild);
    newChild.parentElement = null;
    newChild.parentNode = this;
    newChild.ownerDocument = this;
    return newChild;
  }

  querySelectorAll(selectors: string): RRNode[] {
    return (this.nwsapi.select(selectors) as unknown) as RRNode[];
  }

  getElementsByTagName(tagName: string): RRElement[] {
    if (this.documentElement)
      return (this.documentElement as RRElement).getElementsByTagName(tagName);
    return [];
  }

  getElementsByClassName(className: string): RRElement[] {
    if (this.documentElement)
      return (this.documentElement as RRElement).getElementsByClassName(
        className,
      );
    return [];
  }

  getElementById(elementId: string): RRElement | null {
    if (this.documentElement)
      return (this.documentElement as RRElement).getElementById(elementId);
    return null;
  }

  createDocument(
    _namespace: string | null,
    _qualifiedName: string | null,
    _doctype?: DocumentType | null,
  ) {
    return new RRDocument();
  }

  createDocumentType(
    qualifiedName: string,
    publicId: string,
    systemId: string,
  ) {
    const documentTypeNode = new RRDocumentType(
      qualifiedName,
      publicId,
      systemId,
    );
    documentTypeNode.ownerDocument = this;
    return documentTypeNode;
  }

  createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
  ): RRElementType<K>;
  createElement(tagName: string): RRElement;
  createElement(tagName: string) {
    const upperTagName = tagName.toUpperCase();
    let element;
    switch (upperTagName) {
      case 'AUDIO':
      case 'VIDEO':
        element = new RRMediaElement(upperTagName);
        break;
      case 'IFRAME':
        element = new RRIframeElement(upperTagName);
        break;
      case 'IMG':
        element = new RRImageElement('IMG');
        break;
      default:
        element = new RRElement(upperTagName);
        break;
    }
    element.ownerDocument = this;
    return element;
  }

  createElementNS(
    _namespaceURI: 'http://www.w3.org/2000/svg',
    qualifiedName: string,
  ) {
    return this.createElement(qualifiedName as keyof HTMLElementTagNameMap);
  }

  createComment(data: string) {
    const commentNode = new RRComment(data);
    commentNode.ownerDocument = this;
    return commentNode;
  }

  createCDATASection(data: string) {
    const sectionNode = new RRCDATASection(data);
    sectionNode.ownerDocument = this;
    return sectionNode;
  }

  createTextNode(data: string) {
    const textNode = new RRText(data);
    textNode.ownerDocument = this;
    return textNode;
  }

  /**
   * This does come with some side effects. For example:
   * 1. All event listeners currently registered on the document, nodes inside the document, or the document's window are removed.
   * 2. All existing nodes are removed from the document.
   */
  open() {
    this.children = [];
  }

  close() {}

  buildFromDom(dom: Document) {
    let notSerializedId = -1;
    const NodeTypeMap: Record<number, number> = {};
    NodeTypeMap[document.DOCUMENT_NODE] = NodeType.Document;
    NodeTypeMap[document.DOCUMENT_TYPE_NODE] = NodeType.DocumentType;
    NodeTypeMap[document.ELEMENT_NODE] = NodeType.Element;
    NodeTypeMap[document.TEXT_NODE] = NodeType.Text;
    NodeTypeMap[document.CDATA_SECTION_NODE] = NodeType.CDATA;
    NodeTypeMap[document.COMMENT_NODE] = NodeType.Comment;

    function getValidTagName(element: HTMLElement): string {
      if (element instanceof HTMLFormElement) {
        return 'FORM';
      }
      return element.tagName.toUpperCase().trim();
    }

    const walk = function (node: INode) {
      let serializedNodeWithId = node.__sn;
      let rrNode: RRNode;
      if (!serializedNodeWithId) {
        serializedNodeWithId = {
          type: NodeTypeMap[node.nodeType],
          textContent: '',
          id: notSerializedId,
        };
        notSerializedId -= 1;
        node.__sn = serializedNodeWithId;
      }
      if (!this.mirror.has(serializedNodeWithId.id)) {
        switch (node.nodeType) {
          case node.DOCUMENT_NODE:
            if (
              serializedNodeWithId.rootId &&
              serializedNodeWithId.rootId !== serializedNodeWithId.id
            )
              rrNode = this.createDocument();
            else rrNode = this;
            break;
          case node.DOCUMENT_TYPE_NODE:
            const documentType = (node as unknown) as DocumentType;
            rrNode = this.createDocumentType(
              documentType.name,
              documentType.publicId,
              documentType.systemId,
            );
            break;
          case node.ELEMENT_NODE:
            const elementNode = (node as unknown) as HTMLElement;
            const tagName = getValidTagName(elementNode);
            rrNode = this.createElement(tagName);
            const rrElement = rrNode as RRElement;
            for (const { name, value } of Array.from(elementNode.attributes)) {
              rrElement.attributes[name] = value;
            }
            // form fields
            if (
              tagName === 'INPUT' ||
              tagName === 'TEXTAREA' ||
              tagName === 'SELECT'
            ) {
              const value = (elementNode as
                | HTMLInputElement
                | HTMLTextAreaElement).value;
              if (
                ['RADIO', 'CHECKBOX', 'SUBMIT', 'BUTTON'].includes(
                  rrElement.attributes.type as string,
                ) &&
                value
              ) {
                rrElement.attributes.value = value;
              } else if ((elementNode as HTMLInputElement).checked) {
                rrElement.attributes.checked = (elementNode as HTMLInputElement).checked;
              }
            }
            if (tagName === 'OPTION') {
              const selectValue = (elementNode as HTMLOptionElement)
                .parentElement;
              if (
                rrElement.attributes.value ===
                (selectValue as HTMLSelectElement).value
              ) {
                rrElement.attributes.selected = (elementNode as HTMLOptionElement).selected;
              }
            }
            // canvas image data
            if (tagName === 'CANVAS') {
              rrElement.attributes.rr_dataURL = (elementNode as HTMLCanvasElement).toDataURL();
            }
            // media elements
            if (tagName === 'AUDIO' || tagName === 'VIDEO') {
              const rrMediaElement = rrElement as RRMediaElement;
              rrMediaElement.paused = (elementNode as HTMLMediaElement).paused;
              rrMediaElement.currentTime = (elementNode as HTMLMediaElement).currentTime;
            }
            // scroll
            if (elementNode.scrollLeft) {
              rrElement.scrollLeft = elementNode.scrollLeft;
            }
            if (elementNode.scrollTop) {
              rrElement.scrollTop = elementNode.scrollTop;
            }
            break;
          case node.TEXT_NODE:
            rrNode = this.createTextNode(
              ((node as unknown) as Text).textContent,
            );
            break;
          case node.CDATA_SECTION_NODE:
            rrNode = this.createCDATASection();
            break;
          case node.COMMENT_NODE:
            rrNode = this.createComment(
              ((node as unknown) as Comment).textContent || '',
            );
            break;
          default:
            return;
        }
        rrNode.__sn = serializedNodeWithId;
        this.mirror.set(serializedNodeWithId.id, rrNode);
      } else {
        rrNode = this.mirror.get(serializedNodeWithId.id);
        rrNode.parentElement = null;
        rrNode.parentNode = null;
        rrNode.children = [];
      }
      const parentNode = node.parentElement || node.parentNode;
      if (parentNode) {
        const parentSN = ((parentNode as unknown) as INode).__sn;
        const parentRRNode = this.mirror.get(parentSN.id);
        parentRRNode.appendChild(rrNode);
        rrNode.parentNode = parentRRNode;
        rrNode.parentElement =
          parentRRNode instanceof RRElement ? parentRRNode : null;
      }

      if (
        serializedNodeWithId.type === NodeType.Document ||
        serializedNodeWithId.type === NodeType.Element
      ) {
        node.childNodes.forEach((node) => walk((node as unknown) as INode));
      }
    }.bind(this);

    if (dom) {
      this.destroyTree();
      walk((dom as unknown) as INode);
    }
  }

  destroyTree() {
    this.children = [];
    this.mirror.clear();
  }

  toString() {
    return super.toString('RRDocument');
  }
}

export class RRDocumentType extends RRNode {
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
}

export class RRElement extends RRNode {
  tagName: string;
  attributes: Record<string, string | number | boolean> = {};
  scrollLeft: number = 0;
  scrollTop: number = 0;
  shadowRoot: RRElement | null = null;

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

  get textContent() {
    return '';
  }

  set textContent(newText: string) {}

  get style() {
    const style = (this.attributes.style
      ? parseCSSText(this.attributes.style as string)
      : {}) as Record<string, string> & {
      setProperty: (
        name: string,
        value: string | null,
        priority?: string | null,
      ) => void;
    };
    style.setProperty = (name: string, value: string | null) => {
      const normalizedName = camelize(name);
      if (!value) delete style[normalizedName];
      else style[normalizedName] = value;
      this.attributes.style = toCSSText(style);
    };
    // This is used to bypass the smoothscroll polyfill in rrweb player.
    style.scrollBehavior = '';
    return style;
  }

  get firstElementChild(): RRElement | null {
    for (let child of this.children)
      if (child instanceof RRElement) return child;
    return null;
  }

  get nextElementSibling(): RRElement | null {
    let parentNode = this.parentNode;
    if (!parentNode) return null;
    const siblings = parentNode.children;
    let index = siblings.indexOf(this);
    for (let i = index + 1; i < siblings.length; i++)
      if (siblings[i] instanceof RRElement) return siblings[i] as RRElement;
    return null;
  }

  getAttribute(name: string) {
    let upperName = name && name.toLowerCase();
    if (upperName in this.attributes) return this.attributes[upperName];
    return null;
  }

  setAttribute(name: string, attribute: string) {
    this.attributes[name.toLowerCase()] = attribute;
  }

  hasAttribute(name: string) {
    return (name && name.toLowerCase()) in this.attributes;
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

  appendChild(newChild: RRNode): RRNode {
    this.children.push(newChild);
    newChild.parentNode = this;
    newChild.parentElement = this;
    newChild.ownerDocument = this.ownerDocument;
    return newChild;
  }

  insertBefore(newChild: RRNode, refChild: RRNode | null): RRNode {
    if (refChild === null) return this.appendChild(newChild);
    const childIndex = this.children.indexOf(refChild);
    if (childIndex == -1)
      throw new Error(
        "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode.",
      );
    this.children.splice(childIndex, 0, newChild);
    newChild.parentElement = null;
    newChild.parentNode = this;
    newChild.ownerDocument = this.ownerDocument;
    return newChild;
  }

  querySelectorAll(selectors: string): RRNode[] {
    if (this.ownerDocument !== null) {
      return (this.ownerDocument.nwsapi.select(
        selectors,
        (this as unknown) as Element,
      ) as unknown) as RRNode[];
    }
    return [];
  }

  getElementById(elementId: string): RRElement | null {
    if (this instanceof RRElement && this.id === elementId) return this;
    for (const child of this.children) {
      if (child instanceof RRElement) {
        const result = child.getElementById(elementId);
        if (result !== null) return result;
      }
    }
    return null;
  }

  getElementsByClassName(className: string): RRElement[] {
    let elements: RRElement[] = [];
    const queryClassList = new ClassList(className);
    // Make sure this element has all queried class names.
    if (
      this instanceof RRElement &&
      queryClassList.filter((queriedClassName) =>
        this.classList.some((name) => name === queriedClassName),
      ).length == queryClassList.length
    )
      elements.push(this);
    for (const child of this.children) {
      if (child instanceof RRElement)
        elements = elements.concat(child.getElementsByClassName(className));
    }
    return elements;
  }

  getElementsByTagName(tagName: string): RRElement[] {
    let elements: RRElement[] = [];
    const normalizedTagName = tagName.toUpperCase();
    if (this instanceof RRElement && this.tagName === normalizedTagName)
      elements.push(this);
    for (const child of this.children) {
      if (child instanceof RRElement)
        elements = elements.concat(child.getElementsByTagName(tagName));
    }
    return elements;
  }

  dispatchEvent(_event: Event) {
    return true;
  }

  /**
   * Creates a shadow root for element and returns it.
   */
  attachShadow(init: ShadowRootInit): RRElement {
    this.shadowRoot = init.mode === 'open' ? this : null;
    return this;
  }

  toString() {
    let attributeString = '';
    for (let attribute in this.attributes) {
      attributeString += `${attribute}="${this.attributes[attribute]}" `;
    }
    return `${super.toString(this.tagName)} ${attributeString}`;
  }
}

export class RRImageElement extends RRElement {
  src: string;
  width: number;
  height: number;
  onload: ((this: GlobalEventHandlers, ev: Event) => any) | null;
}

export class RRMediaElement extends RRElement {
  currentTime: number = 0;
  paused: boolean = true;
  async play() {
    this.paused = false;
  }
  async pause() {
    this.paused = true;
  }
}

export class RRIframeElement extends RRElement {
  width: string = '';
  height: string = '';
  src: string = '';
  contentDocument: RRDocument = new RRDocument();
  contentWindow: RRWindow = new RRWindow();

  constructor(tagName: string) {
    super(tagName);
    const htmlElement = this.contentDocument.createElement('HTML');
    this.contentDocument.appendChild(htmlElement);
    htmlElement.appendChild(this.contentDocument.createElement('HEAD'));
    htmlElement.appendChild(this.contentDocument.createElement('BODY'));
  }
}

export class RRText extends RRNode {
  textContent: string;

  constructor(data: string) {
    super();
    this.textContent = data;
  }

  toString() {
    return `${super.toString('RRText')} text=${JSON.stringify(
      this.textContent,
    )}`;
  }
}

export class RRComment extends RRNode {
  data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }

  toString() {
    return `${super.toString('RRComment')} data=${JSON.stringify(this.data)}`;
  }
}
export class RRCDATASection extends RRNode {
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
}

interface RRElementTagNameMap {
  img: RRImageElement;
  audio: RRMediaElement;
  video: RRMediaElement;
}

type RRElementType<
  K extends keyof HTMLElementTagNameMap
> = K extends keyof RRElementTagNameMap ? RRElementTagNameMap[K] : RRElement;

class ClassList extends Array {
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
