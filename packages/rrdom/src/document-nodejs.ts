import { NodeType } from 'rrweb-snapshot';
import { NWSAPI } from 'nwsapi';
import {
  BaseRRCDATASectionImpl,
  BaseRRCommentImpl,
  BaseRRDocumentImpl,
  BaseRRDocumentTypeImpl,
  BaseRRElementImpl,
  BaseRRMediaElementImpl,
  BaseRRNode,
  BaseRRTextImpl,
  ClassList,
  IRRDocument,
} from './document';
const nwsapi = require('nwsapi');
const cssom = require('cssom');

export class RRNode extends BaseRRNode {
  ownerDocument: RRDocument | null = null;
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

export class RRDocument
  extends BaseRRDocumentImpl(RRNode)
  implements IRRDocument {
  private _nwsapi: NWSAPI;
  get nwsapi() {
    if (!this._nwsapi) {
      this._nwsapi = nwsapi({
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

  get documentElement(): RRElement | null {
    return super.documentElement as RRElement | null;
  }

  get body(): RRElement | null {
    return super.body as RRElement | null;
  }

  get head() {
    return super.head as RRElement | null;
  }

  get implementation(): RRDocument {
    return this;
  }

  get firstElementChild(): RRElement | null {
    return this.documentElement as RRElement | null;
  }

  appendChild(childNode: RRNode) {
    return super.appendChild(childNode);
  }

  insertBefore(newChild: RRNode, refChild: RRNode | null) {
    return super.insertBefore(newChild, refChild);
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
        element = new RRIFrameElement(upperTagName);
        break;
      case 'IMG':
        element = new RRImageElement('IMG');
        break;
      case 'CANVAS':
        element = new RRCanvasElement('CANVAS');
        break;
      case 'STYLE':
        element = new RRStyleElement('STYLE');
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
}

export class RRDocumentType extends BaseRRDocumentTypeImpl(RRNode) {}

export class RRElement extends BaseRRElementImpl(RRNode) {
  attachShadow(_init: ShadowRootInit): RRElement {
    const shadowRoot = new RRElement('SHADOWROOT');
    this.shadowRoot = shadowRoot;
    return shadowRoot;
  }

  appendChild(newChild: RRNode): RRNode {
    return super.appendChild(newChild) as RRNode;
  }

  insertBefore(newChild: RRNode, refChild: RRNode | null): RRNode {
    return super.insertBefore(newChild, refChild) as RRNode;
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
    return name.toLowerCase() in this.attributes;
  }

  removeAttribute(name: string) {
    delete this.attributes[name.toLowerCase()];
  }

  get firstElementChild(): RRElement | null {
    for (let child of this.childNodes)
      if (child.RRNodeType === NodeType.Element) return child as RRElement;
    return null;
  }

  get nextElementSibling(): RRElement | null {
    let parentNode = this.parentNode;
    if (!parentNode) return null;
    const siblings = parentNode.childNodes;
    let index = siblings.indexOf(this);
    for (let i = index + 1; i < siblings.length; i++)
      if (siblings[i] instanceof RRElement) return siblings[i] as RRElement;
    return null;
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
    if (this.id === elementId) return this;
    for (const child of this.childNodes) {
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
    for (const child of this.childNodes) {
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
    for (const child of this.childNodes) {
      if (child instanceof RRElement)
        elements = elements.concat(child.getElementsByTagName(tagName));
    }
    return elements;
  }
}

export class RRImageElement extends RRElement {
  src: string;
  width: number;
  height: number;
  onload: ((this: GlobalEventHandlers, ev: Event) => any) | null;
}

export class RRMediaElement extends BaseRRMediaElementImpl(RRElement) {}

export class RRCanvasElement extends RRElement {
  /**
   * This is just a dummy implementation to prevent rrweb replayer from drawing mouse tail. If further analysis of canvas is needed, we may implement it with node-canvas.
   */
  getContext(): CanvasRenderingContext2D | null {
    return null;
  }
}

export class RRStyleElement extends RRElement {
  private _sheet: CSSStyleSheet | null = null;

  get sheet() {
    if (!this._sheet) {
      let result = '';
      for (let child of this.childNodes)
        if (child.nodeType === NodeType.Text)
          result += (child as RRText).textContent;
      this._sheet = cssom.parse(result);
    }
    return this._sheet;
  }
}

export class RRIFrameElement extends RRElement {
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

export class RRText extends BaseRRTextImpl(RRNode) {}

export class RRComment extends BaseRRCommentImpl(RRNode) {}

export class RRCDATASection extends BaseRRCDATASectionImpl(RRNode) {}

interface RRElementTagNameMap {
  audio: RRMediaElement;
  canvas: RRCanvasElement;
  iframe: RRIFrameElement;
  img: RRImageElement;
  style: RRStyleElement;
  video: RRMediaElement;
}

type RRElementType<
  K extends keyof HTMLElementTagNameMap
> = K extends keyof RRElementTagNameMap ? RRElementTagNameMap[K] : RRElement;
