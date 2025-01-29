import { createMirror as createNodeMirror } from '@saola.ai/rrweb-snapshot';
import type { Mirror as NodeMirror } from '@saola.ai/rrweb-snapshot';
import { NodeType as RRNodeType } from '@saola.ai/rrweb-types';
import type {
  IMirror,
  serializedNodeWithId,
  canvasMutationData,
  canvasEventWithTime,
  inputData,
  scrollData,
  styleSheetRuleData,
  styleDeclarationData,
} from '@saola.ai/rrweb-types';
import {
  BaseRRNode as RRNode,
  BaseRRCDATASection,
  BaseRRComment,
  BaseRRDocument,
  BaseRRDocumentType,
  BaseRRElement,
  BaseRRMediaElement,
  BaseRRText,
  type IRRDocument,
  type IRRElement,
  type IRRNode,
  NodeType,
  type IRRDocumentType,
  type IRRText,
  type IRRComment,
  BaseRRDialogElement,
} from './document';

export class RRDocument extends BaseRRDocument {
  private UNSERIALIZED_STARTING_ID = -2;
  // In the rrweb replayer, there are some unserialized nodes like the element that stores the injected style rules.
  // These unserialized nodes may interfere the execution of the diff algorithm.
  // The id of serialized node is larger than 0. So this value less than 0 is used as id for these unserialized nodes.
  private _unserializedId = this.UNSERIALIZED_STARTING_ID;

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
        element = new RRIFrameElement(upperTagName, this.mirror);
        break;
      case 'CANVAS':
        element = new RRCanvasElement(upperTagName);
        break;
      case 'STYLE':
        element = new RRStyleElement(upperTagName);
        break;
      case 'DIALOG':
        element = new RRDialogElement(upperTagName);
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
    this.firstChild = null;
    this.lastChild = null;
    this.mirror.reset();
  }

  open() {
    super.open();
    this._unserializedId = this.UNSERIALIZED_STARTING_ID;
  }
}

export const RRDocumentType = BaseRRDocumentType;

export class RRElement extends BaseRRElement {
  inputData: inputData | null = null;
  scrollData: scrollData | null = null;
}

export class RRMediaElement extends BaseRRMediaElement {}

export class RRDialogElement extends BaseRRDialogElement {}

export class RRCanvasElement extends RRElement implements IRRElement {
  public rr_dataURL: string | null = null;
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
  public rules: (styleSheetRuleData | styleDeclarationData)[] = [];
}

export class RRIFrameElement extends RRElement {
  contentDocument: RRDocument = new RRDocument();
  constructor(upperTagName: string, mirror: Mirror) {
    super(upperTagName);
    this.contentDocument.mirror = mirror;
  }
}

export const RRText = BaseRRText;
export type RRText = typeof RRText;

export const RRComment = BaseRRComment;
export type RRComment = typeof RRComment;

export const RRCDATASection = BaseRRCDATASection;
export type RRCDATASection = typeof RRCDATASection;

interface RRElementTagNameMap {
  audio: RRMediaElement;
  canvas: RRCanvasElement;
  iframe: RRIFrameElement;
  style: RRStyleElement;
  video: RRMediaElement;
}

type RRElementType<K extends keyof HTMLElementTagNameMap> =
  K extends keyof RRElementTagNameMap ? RRElementTagNameMap[K] : RRElement;

function getValidTagName(element: HTMLElement): string {
  // https://github.com/rrweb-io/rrweb-snapshot/issues/56
  if (element instanceof HTMLFormElement) {
    return 'FORM';
  }
  return element.tagName.toUpperCase();
}

/**
 * Build a RRNode from a real Node.
 * @param node - the real Node
 * @param rrdom - the RRDocument
 * @param domMirror - the NodeMirror that records the real document tree
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
    case NodeType.DOCUMENT_TYPE_NODE: {
      const documentType = node as DocumentType;
      rrNode = rrdom.createDocumentType(
        documentType.name,
        documentType.publicId,
        documentType.systemId,
      );
      break;
    }
    case NodeType.ELEMENT_NODE: {
      const elementNode = node as HTMLElement;
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
    }
    case NodeType.TEXT_NODE:
      rrNode = rrdom.createTextNode((node as Text).textContent || '');
      break;
    case NodeType.CDATA_SECTION_NODE:
      rrNode = rrdom.createCDATASection((node as CDATASection).data);
      break;
    case NodeType.COMMENT_NODE:
      rrNode = rrdom.createComment((node as Comment).textContent || '');
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
 * @param dom - the real document tree
 * @param domMirror - the NodeMirror that records the real document tree
 * @param rrdom - the rrdom object to be constructed
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
      const iframeDoc = (node as HTMLIFrameElement).contentDocument;
      iframeDoc && walk(iframeDoc, rrNode);
    } else if (
      node.nodeType === NodeType.DOCUMENT_NODE ||
      node.nodeType === NodeType.ELEMENT_NODE ||
      node.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      // if the node is a shadow dom
      if (
        node.nodeType === NodeType.ELEMENT_NODE &&
        (node as HTMLElement).shadowRoot
      )
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        walk((node as HTMLElement).shadowRoot!, rrNode);
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
    const oldNode = this.getNode(id);
    if (oldNode) {
      const meta = this.nodeMetaMap.get(oldNode);
      if (meta) this.nodeMetaMap.set(n, meta);
    }
    this.idNodeMap.set(id, n);
  }

  reset() {
    this.idNodeMap = new Map();
    this.nodeMetaMap = new WeakMap();
  }
}

/**
 * Get a default serializedNodeWithId value for a RRNode.
 * @param id - the serialized id to assign
 */
export function getDefaultSN(node: IRRNode, id: number): serializedNodeWithId {
  switch (node.RRNodeType) {
    case RRNodeType.Document:
      return {
        id,
        type: node.RRNodeType,
        childNodes: [],
      };
    case RRNodeType.DocumentType: {
      const doctype = node as IRRDocumentType;
      return {
        id,
        type: node.RRNodeType,
        name: doctype.name,
        publicId: doctype.publicId,
        systemId: doctype.systemId,
      };
    }
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

/**
 * Print the RRDom as a string.
 * @param rootNode - the root node of the RRDom tree
 * @param mirror - a rrweb or rrdom Mirror
 * @returns printed string
 */
export function printRRDom(rootNode: IRRNode, mirror: IMirror<IRRNode>) {
  return walk(rootNode, mirror, '');
}
function walk(node: IRRNode, mirror: IMirror<IRRNode>, blankSpace: string) {
  let printText = `${blankSpace}${mirror.getId(node)} ${node.toString()}\n`;
  if (node.RRNodeType === RRNodeType.Element) {
    const element = node as IRRElement;
    if (element.shadowRoot)
      printText += walk(element.shadowRoot, mirror, blankSpace + '  ');
  }
  for (const child of node.childNodes)
    printText += walk(child, mirror, blankSpace + '  ');
  if (node.nodeName === 'IFRAME')
    printText += walk(
      (node as RRIFrameElement).contentDocument,
      mirror,
      blankSpace + '  ',
    );
  return printText;
}

export { RRNode };

export { diff, createOrGetNode, type ReplayerHandler } from './diff';
export * from './document';
