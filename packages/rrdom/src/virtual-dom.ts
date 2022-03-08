import { INode, NodeType } from 'rrweb-snapshot';
import type {
  canvasMutationData,
  incrementalSnapshotEvent,
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
} from './document';
import { VirtualStyleRules } from './diff';

export class RRDocument extends BaseRRDocumentImpl(RRNode) {
  public mirror: Mirror = {
    map: {},
    getId(n) {
      return n?.__sn?.id >= 0 ? n.__sn.id : -1;
    },
    getNode(id) {
      return this.map[id] || null;
    },
    removeNodeFromMap(n) {
      const id = n.__sn.id;
      delete this.map[id];
      if (n.childNodes) {
        n.childNodes.forEach((child) => this.removeNodeFromMap(child));
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
}

export const RRDocumentType = BaseRRDocumentTypeImpl(RRNode);

export class RRElement extends BaseRRElementImpl(RRNode) {
  inputData: inputData | null = null;
  scrollData: scrollData | null = null;
}

export class RRMediaElement extends BaseRRMediaElementImpl(RRElement) {}

export class RRCanvasElement extends RRElement implements IRRElement {
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
  getContext(): RenderingContext | null {
    return null;
  }
}

export class RRStyleElement extends RRElement {
  public rules: VirtualStyleRules = [];
}

export class RRIFrameElement extends RRElement {
  contentDocument: RRDocument = new RRDocument();
}

export const RRText = BaseRRTextImpl(RRNode);
export type RRText = typeof RRText;

export const RRComment = BaseRRCommentImpl(RRNode);
export type RRComment = typeof RRComment;

export const RRCDATASection = BaseRRCDATASectionImpl(RRNode);
export type RRCDATASection = typeof RRCDATASection;

export type Mirror = {
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

/**
 * Build a RRNode from a real Node.
 * @param node the real Node
 * @param rrdom the RRDocument
 * @returns the built RRNode
 */
export function buildFromNode(
  node: INode,
  rrdom: IRRDocument,
  parentRRNode?: IRRNode | null,
): IRRNode | null {
  let serializedNodeWithId = node.__sn;
  let rrNode: IRRNode;
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
      if (
        parentRRNode &&
        parentRRNode.RRNodeType === NodeType.Element &&
        (parentRRNode as IRRElement).tagName === 'IFRAME'
      )
        rrNode = (parentRRNode as RRIFrameElement).contentDocument;
      else rrNode = rrdom;
      break;
    case node.DOCUMENT_TYPE_NODE:
      const documentType = (node as Node) as DocumentType;
      rrNode = rrdom.createDocumentType(
        documentType.name,
        documentType.publicId,
        documentType.systemId,
      );
      break;
    case node.ELEMENT_NODE:
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
    case node.TEXT_NODE:
      rrNode = rrdom.createTextNode(((node as Node) as Text).textContent || '');
      break;
    case node.CDATA_SECTION_NODE:
      rrNode = rrdom.createCDATASection(((node as Node) as CDATASection).data);
      break;
    case node.COMMENT_NODE:
      rrNode = rrdom.createComment(
        ((node as Node) as Comment).textContent || '',
      );
      break;
    // if node is a shadow root
    case node.DOCUMENT_FRAGMENT_NODE:
      rrNode = (parentRRNode as IRRElement).attachShadow({ mode: 'open' });
      break;
    default:
      return null;
  }
  rrNode.__sn = serializedNodeWithId;
  return rrNode;
}

/**
 * Build a RRDocument from a real document tree.
 * @param dom the real document tree
 * @param rrdomToBuild the rrdom object to be constructed
 * @returns the build rrdom
 */
export function buildFromDom(
  dom: Document,
  rrdomToBuild?: IRRDocument,
  mirror?: Mirror,
) {
  let rrdom = rrdomToBuild || new RRDocument();

  function walk(node: INode, parentRRNode: IRRNode | null) {
    const rrNode = buildFromNode(node, rrdom, parentRRNode);
    if (rrNode === null) return;
    mirror && (mirror.map[rrNode.__sn.id] = rrNode);

    if (
      // if the parentRRNode isn't a RRIFrameElement
      !(
        parentRRNode?.RRNodeType === NodeType.Element &&
        (parentRRNode as IRRElement).tagName === 'IFRAME'
      ) &&
      // if node isn't a shadow root
      node.nodeType !== node.DOCUMENT_FRAGMENT_NODE
    ) {
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
      // if the node is a shadow dom
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
  }
  walk((dom as unknown) as INode, null);
  return rrdom;
}

export { RRNode };
export {
  diff,
  createOrGetNode,
  StyleRuleType,
  VirtualStyleRules,
} from './diff';
