import {
  NodeType as RRNodeType,
  createMirror as createNodeMirror,
} from 'rrweb-snapshot';
import type {
  Mirror as NodeMirror,
  IMirror,
  serializedNodeWithId,
} from 'rrweb-snapshot';
import type {
  canvasMutationData,
  canvasEventWithTime,
  inputData,
  scrollData,
} from 'rrweb/src/types';
import {
  BaseRRNode as RRNode,
  BaseRRCDATASectionImpl,
  BaseRRCommentImpl,
  BaseRRDocumentImpl,
  BaseRRDocumentTypeImpl,
  BaseRRElementImpl,
  BaseRRMediaElementImpl,
  BaseRRTextImpl,
  IRRDocument,
  IRRElement,
  IRRNode,
  NodeType,
  IRRDocumentType,
  IRRText,
  IRRComment,
} from './document';
import type { VirtualStyleRules } from './diff';

export class RRDocument extends BaseRRDocumentImpl(RRNode) {
  // In the rrweb replayer, there are some unserialized nodes like the element that stores the injected style rules.
  // These unserialized nodes may interfere the execution of the diff algorithm.
  // The id of serialized node is larger than 0. So this value ​​less than 0 is used as id for these unserialized nodes.
  private _unserializedId = -1;

  /**
   * Every time the id is used, it will minus 1 automatically to avoid collisions.
   */
  public get unserializedId(): number {
    return this._unserializedId--;
  }

  public mirror: Mirror = createMirror();

  public scrollData: scrollData | null = null;

  constructor(mirror?: Mirror) {
    super();
    if (mirror) {
      this.mirror = mirror;
    }
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
        element = new RRIFrameElement(upperTagName, this.mirror);
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

  destroyTree() {
    this.childNodes = [];
    this.mirror.reset();
  }

  open() {
    super.open();
    this._unserializedId = -1;
  }
}

export const RRDocumentType = BaseRRDocumentTypeImpl(RRNode);

export class RRElement extends BaseRRElementImpl(RRNode) {
  inputData: inputData | null = null;
  scrollData: scrollData | null = null;
}

export class RRMediaElement extends BaseRRMediaElementImpl(RRElement) {}

export class RRCanvasElement extends RRElement implements IRRElement {
  public canvasMutations: {
    event: canvasEventWithTime;
    mutation: canvasMutationData;
  }[] = [];
  /**
   * This is a dummy implementation to distinguish RRCanvasElement from real HTMLCanvasElement.
   */
  getContext(): RenderingContext | null {
    return null;
  }
}

export class RRStyleElement extends RRElement {
  public rules: VirtualStyleRules = [];
}

export class RRIFrameElement extends RRElement {
  contentDocument: RRDocument = new RRDocument();
  constructor(upperTagName: string, mirror: Mirror) {
    super(upperTagName);
    this.contentDocument.mirror = mirror;
  }
}

export const RRText = BaseRRTextImpl(RRNode);
export type RRText = typeof RRText;

export const RRComment = BaseRRCommentImpl(RRNode);
export type RRComment = typeof RRComment;

export const RRCDATASection = BaseRRCDATASectionImpl(RRNode);
export type RRCDATASection = typeof RRCDATASection;

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

function getValidTagName(element: HTMLElement): string {
  // https://github.com/rrweb-io/rrweb-snapshot/issues/56
  if (element instanceof HTMLFormElement) {
    return 'FORM';
  }
  return element.tagName.toUpperCase();
}

/**
 * Build a RRNode from a real Node.
 * @param node the real Node
 * @param rrdom the RRDocument
 * @param domMirror the NodeMirror that records the real document tree
 * @returns the built RRNode
 */
export function buildFromNode(
  node: Node,
  rrdom: IRRDocument,
  domMirror: NodeMirror,
  parentRRNode?: IRRNode | null,
): IRRNode | null {
  let rrNode: IRRNode;

  switch (node.nodeType) {
    case NodeType.DOCUMENT_NODE:
      if (parentRRNode && parentRRNode.nodeName === 'IFRAME')
        rrNode = (parentRRNode as RRIFrameElement).contentDocument;
      else {
        rrNode = rrdom;
        (rrNode as IRRDocument).compatMode = (node as Document).compatMode as
          | 'BackCompat'
          | 'CSS1Compat';
      }
      break;
    case NodeType.DOCUMENT_TYPE_NODE:
      const documentType = (node as Node) as DocumentType;
      rrNode = rrdom.createDocumentType(
        documentType.name,
        documentType.publicId,
        documentType.systemId,
      );
      break;
    case NodeType.ELEMENT_NODE:
      const elementNode = (node as Node) as HTMLElement;
      const tagName = getValidTagName(elementNode);
      rrNode = rrdom.createElement(tagName);
      const rrElement = rrNode as IRRElement;
      for (const { name, value } of Array.from(elementNode.attributes)) {
        rrElement.attributes[name] = value;
      }
      elementNode.scrollLeft && (rrElement.scrollLeft = elementNode.scrollLeft);
      elementNode.scrollTop && (rrElement.scrollTop = elementNode.scrollTop);
      /**
       * We don't have to record special values of input elements at the beginning.
       * Because if these values are changed later, the mutation will be applied through the batched input events on its RRElement after the diff algorithm is executed.
       */
      break;
    case NodeType.TEXT_NODE:
      rrNode = rrdom.createTextNode(((node as Node) as Text).textContent || '');
      break;
    case NodeType.CDATA_SECTION_NODE:
      rrNode = rrdom.createCDATASection(((node as Node) as CDATASection).data);
      break;
    case NodeType.COMMENT_NODE:
      rrNode = rrdom.createComment(
        ((node as Node) as Comment).textContent || '',
      );
      break;
    // if node is a shadow root
    case NodeType.DOCUMENT_FRAGMENT_NODE:
      rrNode = (parentRRNode as IRRElement).attachShadow({ mode: 'open' });
      break;
    default:
      return null;
  }

  let sn: serializedNodeWithId | null = domMirror.getMeta(node);

  if (rrdom instanceof RRDocument) {
    if (!sn) {
      sn = getDefaultSN(rrNode, rrdom.unserializedId);
      domMirror.add(node, sn);
    }
    rrdom.mirror.add(rrNode, { ...sn });
  }

  return rrNode;
}

/**
 * Build a RRDocument from a real document tree.
 * @param dom the real document tree
 * @param domMirror the NodeMirror that records the real document tree
 * @param rrdom the rrdom object to be constructed
 * @returns the build rrdom
 */
export function buildFromDom(
  dom: Document,
  domMirror: NodeMirror = createNodeMirror(),
  rrdom: IRRDocument = new RRDocument(),
) {
  function walk(node: Node, parentRRNode: IRRNode | null) {
    const rrNode = buildFromNode(node, rrdom, domMirror, parentRRNode);
    if (rrNode === null) return;
    if (
      // if the parentRRNode isn't a RRIFrameElement
      parentRRNode?.nodeName !== 'IFRAME' &&
      // if node isn't a shadow root
      node.nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      parentRRNode?.appendChild(rrNode);
      rrNode.parentNode = parentRRNode;
      rrNode.parentElement = parentRRNode as RRElement;
    }

    if (node.nodeName === 'IFRAME') {
      walk((node as HTMLIFrameElement).contentDocument!, rrNode);
    } else if (
      node.nodeType === NodeType.DOCUMENT_NODE ||
      node.nodeType === NodeType.ELEMENT_NODE ||
      node.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      // if the node is a shadow dom
      if (
        node.nodeType === NodeType.ELEMENT_NODE &&
        ((node as Node) as HTMLElement).shadowRoot
      )
        walk(((node as Node) as HTMLElement).shadowRoot!, rrNode);
      node.childNodes.forEach((childNode) => walk(childNode, rrNode));
    }
  }
  walk(dom, null);
  return rrdom;
}

export function createMirror(): Mirror {
  return new Mirror();
}

// based on Mirror from rrweb-snapshots
export class Mirror implements IMirror<RRNode> {
  private idNodeMap: Map<number, RRNode> = new Map();
  private nodeMetaMap: WeakMap<RRNode, serializedNodeWithId> = new WeakMap();

  getId(n: RRNode | undefined | null): number {
    if (!n) return -1;

    const id = this.getMeta(n)?.id;

    // if n is not a serialized Node, use -1 as its id.
    return id ?? -1;
  }

  getNode(id: number): RRNode | null {
    return this.idNodeMap.get(id) || null;
  }

  getIds(): number[] {
    return Array.from(this.idNodeMap.keys());
  }

  getMeta(n: RRNode): serializedNodeWithId | null {
    return this.nodeMetaMap.get(n) || null;
  }

  // removes the node from idNodeMap
  // doesn't remove the node from nodeMetaMap
  removeNodeFromMap(n: RRNode) {
    const id = this.getId(n);
    this.idNodeMap.delete(id);

    if (n.childNodes) {
      n.childNodes.forEach((childNode) => this.removeNodeFromMap(childNode));
    }
  }
  has(id: number): boolean {
    return this.idNodeMap.has(id);
  }

  hasNode(node: RRNode): boolean {
    return this.nodeMetaMap.has(node);
  }

  add(n: RRNode, meta: serializedNodeWithId) {
    const id = meta.id;
    this.idNodeMap.set(id, n);
    this.nodeMetaMap.set(n, meta);
  }

  replace(id: number, n: RRNode) {
    this.idNodeMap.set(id, n);
  }

  reset() {
    this.idNodeMap = new Map();
    this.nodeMetaMap = new WeakMap();
  }
}

/**
 * Get a default serializedNodeWithId value for a RRNode.
 * @param id the serialized id to assign
 */
export function getDefaultSN(node: IRRNode, id: number): serializedNodeWithId {
  switch (node.RRNodeType) {
    case RRNodeType.Document:
      return {
        id,
        type: node.RRNodeType,
        childNodes: [],
      };
    case RRNodeType.DocumentType:
      const doctype = node as IRRDocumentType;
      return {
        id,
        type: node.RRNodeType,
        name: doctype.name,
        publicId: doctype.publicId,
        systemId: doctype.systemId,
      };
    case RRNodeType.Element:
      return {
        id,
        type: node.RRNodeType,
        tagName: (node as IRRElement).tagName.toLowerCase(), // In rrweb data, all tagNames are lowercase.
        attributes: {},
        childNodes: [],
      };
    case RRNodeType.Text:
      return {
        id,
        type: node.RRNodeType,
        textContent: (node as IRRText).textContent || '',
      };
    case RRNodeType.Comment:
      return {
        id,
        type: node.RRNodeType,
        textContent: (node as IRRComment).textContent || '',
      };
    case RRNodeType.CDATA:
      return {
        id,
        type: node.RRNodeType,
        textContent: '',
      };
  }
}

export { RRNode };
export {
  diff,
  createOrGetNode,
  StyleRuleType,
  VirtualStyleRules,
  ReplayerHandler,
} from './diff';
