import { INode, NodeType, serializedNodeWithId } from 'rrweb-snapshot';
import type {
  canvasMutationData,
  incrementalSnapshotEvent,
  inputData,
  scrollData,
} from 'rrweb/src/types';
import { parseCSSText, camelize, toCSSText } from './style';

export abstract class RRNode {
  __sn: serializedNodeWithId;
  children: Array<RRNode> = [];
  parentElement: RRElement | null = null;
  parentNode: RRNode | null = null;
  ELEMENT_NODE = 1;
  TEXT_NODE = 3;

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

  get firstChild(): RRNode | null {
    return this.childNodes[0] ?? null;
  }

  get nextSibling(): RRNode | null {
    let parentNode = this.parentNode;
    if (!parentNode) return null;
    const siblings = parentNode.children;
    let index = siblings.indexOf(this);
    return siblings[index + 1] ?? null;
  }

  get textContent(): string | null {
    if (
      this instanceof RRText ||
      this instanceof RRComment ||
      this instanceof RRCDATASection
    )
      return this.data;
    else if (this instanceof RRElement) {
      let result = '';
      this.childNodes.forEach((node) => result + node.textContent);
      return result;
    } else return null;
  }

  set textContent(textContent: string | null) {
    textContent = textContent || '';
    if (
      this instanceof RRText ||
      this instanceof RRComment ||
      this instanceof RRCDATASection
    )
      this.data = textContent;
    else if (this instanceof RRElement) {
      if (this.childNodes[0] instanceof RRText)
        this.childNodes[0].textContent = textContent;
    }
  }

  contains(node: RRNode) {
    if (node === this) return true;
    for (const child of this.children) {
      if (child.contains(node)) return true;
    }
    return false;
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

export class RRDocument extends RRNode {
  private _notSerializedId = -1; // used as an id to identify not serialized node
  /**
   * Every time the id is used, it will minus 1 automatically to avoid collisions.
   */
  get notSerializedId(): number {
    return this._notSerializedId--;
  }
  public mirror: Mirror = {
    map: {},
    getId(n) {
      return n.__sn.id >= 0 ? n.__sn.id : -1;
    },
    getNode(id) {
      return this.map[id] || null;
    },
    removeNodeFromMap(n) {
      const id = n.__sn.id;
      delete this.map[id];
      if (n.childNodes) {
        n.childNodes.forEach((child) =>
          this.removeNodeFromMap(child as RRNode),
        );
      }
    },
    has(id) {
      return this.map.hasOwnProperty(id);
    },
    reset() {
      this.map = {};
    },
  };

  scrollData: scrollData | null = null;

  get documentElement(): RRElement {
    return this.children.find(
      (node) => node instanceof RRElement && node.tagName === 'HTML',
    ) as RRElement;
  }

  get body() {
    return (
      (this.documentElement?.children.find(
        (node) => node instanceof RRElement && node.tagName === 'BODY',
      ) as RRElement) || null
    );
  }

  get head() {
    return (
      (this.documentElement?.children.find(
        (node) => node instanceof RRElement && node.tagName === 'HEAD',
      ) as RRElement) || null
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
    return newChild;
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
    return commentNode;
  }

  createCDATASection(data: string) {
    const sectionNode = new RRCDATASection(data);
    return sectionNode;
  }

  createTextNode(data: string) {
    const textNode = new RRText(data);
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
      const doctype = new RRDocumentType('html', publicId, '');
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

  destroyTree() {
    this.children = [];
    this.mirror.reset();
  }

  toString() {
    return super.toString('RRDocument');
  }
}

/**
 * Build a rrdom from a real document tree.
 * @param dom the real document tree
 * @param rrdomToBuild the rrdom object to be constructed
 * @returns the build rrdom
 */
export function buildFromDom(
  dom: Document,
  rrdomToBuild?: RRDocument,
  mirror?: Mirror,
) {
  let rrdom = rrdomToBuild ?? new RRDocument();

  const NodeTypeMap: Record<number, number> = {};
  NodeTypeMap[document.DOCUMENT_NODE] = NodeType.Document;
  NodeTypeMap[document.DOCUMENT_TYPE_NODE] = NodeType.DocumentType;
  NodeTypeMap[document.ELEMENT_NODE] = NodeType.Element;
  NodeTypeMap[document.TEXT_NODE] = NodeType.Text;
  NodeTypeMap[document.CDATA_SECTION_NODE] = NodeType.CDATA;
  NodeTypeMap[document.COMMENT_NODE] = NodeType.Comment;

  function getValidTagName(element: HTMLElement): string {
    // https://github.com/rrweb-io/rrweb-snapshot/issues/56
    if (element instanceof HTMLFormElement) {
      return 'FORM';
    }
    return element.tagName.toUpperCase();
  }

  const walk = function (node: INode, parentRRNode: RRNode | null) {
    let serializedNodeWithId = node.__sn;
    let rrNode: RRNode;
    if (!serializedNodeWithId || serializedNodeWithId.id < 0) {
      serializedNodeWithId = {
        type: NodeTypeMap[node.nodeType],
        textContent: '',
        id: rrdom.notSerializedId,
      };
      node.__sn = serializedNodeWithId;
    }

    switch (node.nodeType) {
      case node.DOCUMENT_NODE:
        if (parentRRNode && parentRRNode instanceof RRIFrameElement)
          rrNode = parentRRNode.contentDocument;
        else rrNode = rrdom;
        break;
      case node.DOCUMENT_TYPE_NODE:
        const documentType = (node as unknown) as DocumentType;
        rrNode = rrdom.createDocumentType(
          documentType.name,
          documentType.publicId,
          documentType.systemId,
        );
        break;
      case node.ELEMENT_NODE:
        const elementNode = (node as unknown) as HTMLElement;
        const tagName = getValidTagName(elementNode);
        rrNode = rrdom.createElement(tagName);
        const rrElement = rrNode as RRElement;
        for (const { name, value } of Array.from(elementNode.attributes)) {
          rrElement.attributes[name] = value;
        }
        /**
         * We don't have to record special values of input elements at the beginning.
         * Because if these values are changed later, the mutation will be applied through the batched input events on its RRElement after the diff algorithm is executed.
         */
        // canvas image data
        if (tagName === 'CANVAS') {
          rrElement.attributes.rr_dataURL = (elementNode as HTMLCanvasElement).toDataURL();
        }
        break;
      case node.TEXT_NODE:
        rrNode = rrdom.createTextNode(
          ((node as unknown) as Text).textContent || '',
        );
        break;
      case node.CDATA_SECTION_NODE:
        rrNode = rrdom.createCDATASection('');
        break;
      case node.COMMENT_NODE:
        rrNode = rrdom.createComment(
          ((node as unknown) as Comment).textContent || '',
        );
        break;
      // if node is a shadow root
      case node.DOCUMENT_FRAGMENT_NODE:
        rrNode = (parentRRNode as RRElement).attachShadow({ mode: 'open' });
        break;
      default:
        return;
    }
    rrNode.__sn = serializedNodeWithId;
    mirror && (mirror.map[serializedNodeWithId.id] = rrNode);

    if (parentRRNode instanceof RRIFrameElement) {
      parentRRNode.contentDocument = rrNode as RRDocument;
    }
    // if node isn't a shadow root
    else if (node.nodeType !== node.DOCUMENT_FRAGMENT_NODE) {
      parentRRNode?.appendChild(rrNode);
      rrNode.parentNode = parentRRNode;
      rrNode.parentElement = parentRRNode as RRElement;
    }

    if (
      node.nodeType === node.ELEMENT_NODE &&
      ((node as Node) as HTMLElement).tagName === 'IFRAME'
    )
      walk(
        (((node as Node) as HTMLIFrameElement)
          .contentDocument as unknown) as INode,
        rrNode,
      );
    else if (
      node.nodeType === node.DOCUMENT_NODE ||
      node.nodeType === node.ELEMENT_NODE ||
      node.nodeType === node.DOCUMENT_FRAGMENT_NODE
    ) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        ((node as Node) as HTMLElement).shadowRoot
      )
        walk(
          (((node as Node) as HTMLElement).shadowRoot! as unknown) as INode,
          rrNode,
        );
      node.childNodes.forEach((node) =>
        walk((node as unknown) as INode, rrNode),
      );
    }
  };
  walk((dom as unknown) as INode, null);
  return rrdom;
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
  attributes: Record<string, string> = {};
  shadowRoot: RRElement | null = null;
  inputData: inputData | null = null;
  scrollData: scrollData | null = null;

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

  appendChild(newChild: RRNode): RRNode {
    this.children.push(newChild);
    newChild.parentNode = this;
    newChild.parentElement = this;
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
    newChild.parentElement = this;
    newChild.parentNode = this;
    return newChild;
  }

  dispatchEvent(_event: Event) {
    return true;
  }

  /**
   * Creates a shadow root for element and returns it.
   */
  attachShadow(_init: ShadowRootInit): RRElement {
    this.shadowRoot = new RRElement('SHADOWROOT');
    return this.shadowRoot;
  }

  toString() {
    let attributeString = '';
    for (let attribute in this.attributes) {
      attributeString += `${attribute}="${this.attributes[attribute]}" `;
    }
    return `${super.toString(this.tagName)} ${attributeString}`;
  }
}

export class RRMediaElement extends RRElement {
  currentTime?: number;
  volume?: number;
  paused?: boolean;
  muted?: boolean;
  play() {
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
}

export class RRCanvasElement extends RRElement {
  public canvasMutation: {
    event: incrementalSnapshotEvent & {
      timestamp: number;
      delay?: number | undefined;
    };
    mutation: canvasMutationData;
  }[] = [];
  /**
   * This is a dummy implementation to distinguish RRCanvasElement from real HTMLCanvasElement.
   */
  getContext(): CanvasRenderingContext2D | null {
    return null;
  }
}

export class RRStyleElement extends RRElement {
  public rules: VirtualStyleRules = [];
}

export class RRIFrameElement extends RRElement {
  width: string = '';
  height: string = '';
  src: string = '';
  contentDocument: RRDocument = new RRDocument();
}

export class RRText extends RRNode {
  data: string;

  constructor(data: string) {
    super();
    this.data = data;
  }

  toString() {
    return `${super.toString('RRText')} text=${JSON.stringify(this.data)}`;
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

type Mirror = {
  map: {
    [key: number]: RRNode;
  };
  getId(n: RRNode): number;
  getNode(id: number): RRNode | null;
  removeNodeFromMap(n: RRNode): void;
  has(id: number): boolean;
  reset(): void;
};

interface RRElementTagNameMap {
  audio: RRMediaElement;
  canvas: RRCanvasElement;
  iframe: RRIFrameElement;
  style: RRStyleElement;
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

export enum StyleRuleType {
  Insert,
  Remove,
  Snapshot,
  SetProperty,
  RemoveProperty,
}
type InsertRule = {
  cssText: string;
  type: StyleRuleType.Insert;
  index?: number | number[];
};
type RemoveRule = {
  type: StyleRuleType.Remove;
  index: number | number[];
};
type SetPropertyRule = {
  type: StyleRuleType.SetProperty;
  index: number[];
  property: string;
  value: string | null;
  priority: string | undefined;
};
type RemovePropertyRule = {
  type: StyleRuleType.RemoveProperty;
  index: number[];
  property: string;
};

export type VirtualStyleRules = Array<
  InsertRule | RemoveRule | SetPropertyRule | RemovePropertyRule
>;

export { diff } from './diff';
