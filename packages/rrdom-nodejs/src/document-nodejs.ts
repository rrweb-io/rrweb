/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NodeType as RRNodeType } from '@saola.ai/rrweb-snapshot';
import type { NWSAPI } from 'nwsapi';
import type { CSSStyleDeclaration as CSSStyleDeclarationType } from 'cssstyle';
import {
  BaseRRCDATASection,
  BaseRRComment,
  BaseRRDocument,
  BaseRRDocumentType,
  BaseRRElement,
  BaseRRMediaElement,
  BaseRRNode,
  BaseRRText,
  ClassList,
  type IRRDocument,
  type CSSStyleDeclaration,
} from '@saola.ai/rrdom';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const nwsapi = require('nwsapi');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const cssom = require('cssom');
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const cssstyle = require('cssstyle');

export class RRWindow {
  scrollLeft = 0;
  scrollTop = 0;
  scrollTo(options?: ScrollToOptions) {
    if (!options) return;
    if (typeof options.left === 'number') this.scrollLeft = options.left;
    if (typeof options.top === 'number') this.scrollTop = options.top;
  }
}

export class RRDocument extends BaseRRDocument implements IRRDocument {
  readonly nodeName = '#document' as const;
  private _nwsapi: NWSAPI | undefined;
  get nwsapi(): NWSAPI {
    if (!this._nwsapi) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      this._nwsapi = nwsapi({
        document: this as unknown as Document,
        DOMException: null as unknown as new (
          message?: string,
          name?: string,
        ) => DOMException,
      }) as NWSAPI;
      this._nwsapi.configure({
        LOGERRORS: false,
        IDS_DUPES: true,
        MIXEDCASE: true,
      });
    }
    return this._nwsapi;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  get documentElement(): RRElement | null {
    return super.documentElement as RRElement | null;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  get body(): RRElement | null {
    return super.body as RRElement | null;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  get head() {
    return super.head as RRElement | null;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  get implementation(): RRDocument {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  get firstElementChild(): RRElement | null {
    return this.documentElement;
  }

  appendChild(childNode: BaseRRNode) {
    return super.appendChild(childNode);
  }

  insertBefore(newChild: BaseRRNode, refChild: BaseRRNode | null) {
    return super.insertBefore(newChild, refChild);
  }

  querySelectorAll(selectors: string): BaseRRNode[] {
    return this.nwsapi.select(selectors) as unknown as BaseRRNode[];
  }

  getElementsByTagName(tagName: string): RRElement[] {
    if (this.documentElement)
      return this.documentElement.getElementsByTagName(tagName);
    return [];
  }

  getElementsByClassName(className: string): RRElement[] {
    if (this.documentElement)
      return this.documentElement.getElementsByClassName(className);
    return [];
  }

  getElementById(elementId: string): RRElement | null {
    if (this.documentElement)
      return this.documentElement.getElementById(elementId);
    return null;
  }

  createDocument(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _namespace: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _qualifiedName: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        element = new RRImageElement(upperTagName);
        break;
      case 'CANVAS':
        element = new RRCanvasElement(upperTagName);
        break;
      case 'STYLE':
        element = new RRStyleElement(upperTagName);
        break;
      default:
        element = new RRElement(upperTagName);
        break;
    }
    element.ownerDocument = this;
    return element;
  }

  createElementNS(_namespaceURI: string, qualifiedName: string) {
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

export class RRDocumentType extends BaseRRDocumentType {}

export class RRElement extends BaseRRElement {
  private _style: CSSStyleDeclarationType;
  constructor(tagName: string) {
    super(tagName);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this._style = new cssstyle.CSSStyleDeclaration();
    const style = this._style;
    Object.defineProperty(this.attributes, 'style', {
      get() {
        return style.cssText;
      },
      set(cssText: string) {
        style.cssText = cssText;
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  get style() {
    return this._style as unknown as CSSStyleDeclaration;
  }

  attachShadow(_init: ShadowRootInit): RRElement {
    return super.attachShadow(_init) as RRElement;
  }

  appendChild(newChild: BaseRRNode): BaseRRNode {
    return super.appendChild(newChild) as BaseRRNode;
  }

  insertBefore(newChild: BaseRRNode, refChild: BaseRRNode | null): BaseRRNode {
    return super.insertBefore(newChild, refChild) as BaseRRNode;
  }

  getAttribute(name: string) {
    const upperName = name && name.toLowerCase();
    if (upperName in this.attributes) return this.attributes[upperName];
    return null;
  }

  setAttribute(name: string, attribute: string) {
    this.attributes[name.toLowerCase()] = attribute;
  }

  removeAttribute(name: string) {
    delete this.attributes[name.toLowerCase()];
  }

  get firstElementChild(): RRElement | null {
    for (const child of this.childNodes)
      if (child.RRNodeType === RRNodeType.Element) return child as RRElement;
    return null;
  }

  get nextElementSibling(): RRElement | null {
    const parentNode = this.parentNode;
    if (!parentNode) return null;
    const siblings = parentNode.childNodes;
    const index = siblings.indexOf(this);
    for (let i = index + 1; i < siblings.length; i++)
      if (siblings[i] instanceof RRElement) return siblings[i] as RRElement;
    return null;
  }

  querySelectorAll(selectors: string): BaseRRNode[] {
    const result: RRElement[] = [];
    if (this.ownerDocument !== null) {
      (this.ownerDocument as RRDocument).nwsapi.select(
        selectors,
        this as unknown as Element,
        (element) => {
          if ((element as unknown as RRElement) !== this)
            result.push(element as unknown as RRElement);
        },
      ) as unknown as BaseRRNode[];
    }
    return result;
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
      queryClassList.classes.filter((queriedClassName) =>
        this.classList.classes.some((name) => name === queriedClassName),
      ).length == queryClassList.classes.length
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
  src = '';
  width = 0;
  height = 0;
  onload: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null;
}

export class RRMediaElement extends BaseRRMediaElement {}

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
      for (const child of this.childNodes)
        if (child.RRNodeType === RRNodeType.Text)
          result += (child as RRText).textContent;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      this._sheet = cssom.parse(result);
    }
    return this._sheet;
  }
}

export class RRIFrameElement extends RRElement {
  width = '';
  height = '';
  src = '';
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

export class RRText extends BaseRRText {
  readonly nodeName = '#text' as const;
}

export class RRComment extends BaseRRComment {
  readonly nodeName = '#comment' as const;
}

export class RRCDATASection extends BaseRRCDATASection {
  readonly nodeName = '#cdata-section' as const;
}

interface RRElementTagNameMap {
  audio: RRMediaElement;
  canvas: RRCanvasElement;
  iframe: RRIFrameElement;
  img: RRImageElement;
  style: RRStyleElement;
  video: RRMediaElement;
}

type RRElementType<K extends keyof HTMLElementTagNameMap> =
  K extends keyof RRElementTagNameMap ? RRElementTagNameMap[K] : RRElement;
