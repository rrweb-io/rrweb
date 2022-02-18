import { INode, NodeType } from 'rrweb-snapshot';
import type {
  canvasMutationData,
  incrementalSnapshotEvent,
  inputData,
  scrollData,
} from 'rrweb/src/types';
import {
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

export class RRDocument
  extends BaseRRDocumentImpl(IRRNode)
  implements IRRDocument {
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
          this.removeNodeFromMap(child as IRRNode),
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

  createDocument(
    _namespace: string | null,
    _qualifiedName: string | null,
    _doctype?: DocumentType | null,
  ) {
    return (new RRDocument() as unknown) as IRRDocument;
  }

  createDocumentType(
    qualifiedName: string,
    publicId: string,
    systemId: string,
  ) {
    return new RRDocumentType(qualifiedName, publicId, systemId);
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
    return this.createElement(qualifiedName);
  }

  createComment(data: string) {
    return new RRComment(data);
  }

  createCDATASection(data: string) {
    return new RRCDATASection(data);
  }

  createTextNode(data: string) {
    return new RRText(data);
  }

  destroyTree() {
    this.children = [];
    this.mirror.reset();
  }
}

export const RRDocumentType = BaseRRDocumentTypeImpl(IRRNode);

export class RRElement extends BaseRRElementImpl(IRRNode) {
  inputData: inputData | null = null;
  scrollData: scrollData | null = null;

  /**
   * Creates a shadow root for element and returns it.
   */
  attachShadow(_init: ShadowRootInit): RRElement {
    const shadowRoot = new RRElement('SHADOWROOT');
    this.shadowRoot = shadowRoot;
    return shadowRoot;
  }
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
  getContext(): CanvasRenderingContext2D | null {
    return null;
  }
}

export class RRStyleElement extends RRElement {
  public rules: VirtualStyleRules = [];
}

export class RRIFrameElement extends RRElement {
  contentDocument: RRDocument = new RRDocument();
}

export const RRText = BaseRRTextImpl(IRRNode);
export type RRText = typeof RRText;

export const RRComment = BaseRRCommentImpl(IRRNode);
export type RRComment = typeof RRComment;

export const RRCDATASection = BaseRRCDATASectionImpl(IRRNode);
export type RRCDATASection = typeof RRCDATASection;

type Mirror = {
  map: {
    [key: number]: IRRNode;
  };
  getId(n: IRRNode): number;
  getNode(id: number): IRRNode | null;
  removeNodeFromMap(n: IRRNode): void;
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

/**
 * Build a rrdom from a real document tree.
 * @param dom the real document tree
 * @param rrdomToBuild the rrdom object to be constructed
 * @returns the build rrdom
 */
export function buildFromDom(
  dom: Document,
  rrdomToBuild?: IRRDocument,
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

  const walk = function (node: INode, parentRRNode: IRRNode | null) {
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
export { IRRNode as RRNode } from './document';
export { diff, StyleRuleType, VirtualStyleRules } from './diff';
