import { elementNode, NodeType, serializedNode } from 'rrweb-snapshot';
import type { serializedNodeWithId, attributes } from 'rrweb-snapshot';
import {
  Mirror,
  RRDocument,
  RRDocumentType,
  RRElement,
  RRIFrameElement,
  RRNode,
  RRMediaElement,
  RRComment,
} from '..';

function serializeNode(
  n: RRNode,
  options: {
    doc: RRDocument;
    mirror: Mirror;
  },
): serializedNode | false {
  const { doc, mirror } = options;
  // Only record root id when document object is not the base document
  const rootId = getRootId(doc, mirror);
  switch (n.RRNodeType) {
    case NodeType.Document:
      if ((n as RRDocument).compatMode !== 'CSS1Compat') {
        return {
          type: NodeType.Document,
          childNodes: [],
          compatMode: (n as RRDocument).compatMode, // probably "BackCompat"
          rootId,
        };
      } else {
        return {
          type: NodeType.Document,
          childNodes: [],
          rootId,
        };
      }
    case NodeType.DocumentType:
      return {
        type: NodeType.DocumentType,
        name: (n as RRDocumentType).name,
        publicId: (n as RRDocumentType).publicId,
        systemId: (n as RRDocumentType).systemId,
        rootId,
      };
    case NodeType.Element:
      return serializeElementNode(n as RRElement, {
        doc,
        mirror,
        rootId,
      });
    case NodeType.Text: {
      const parentTagName = n.parentNode && (n.parentNode as RRElement).tagName;
      const isStyle = parentTagName === 'STYLE' ? true : undefined;
      return {
        type: NodeType.Text,
        textContent: n.textContent || '',
        isStyle,
        rootId,
      };
    }
    case NodeType.CDATA:
      return {
        type: NodeType.CDATA,
        textContent: '',
        rootId,
      };
    case NodeType.Comment:
      return {
        type: NodeType.Comment,
        textContent: (n as RRComment).textContent || '',
        rootId,
      };
    default:
      return false;
  }
}

function getRootId(doc: RRDocument, mirror: Mirror): number | undefined {
  if (!mirror.hasNode(doc)) return undefined;
  const docId = mirror.getId(doc);
  return docId === 1 ? undefined : docId;
}

function getValidTagName(element: RRElement): string {
  if (element instanceof HTMLFormElement) {
    return 'form';
  }

  const processedTagName = element.tagName.toLowerCase().trim();
  const tagNameRegex = new RegExp('[^a-z0-9-_:]');
  if (tagNameRegex.test(processedTagName)) {
    // if the tag name is odd and we cannot extract
    // anything from the string, then we return a
    // generic div
    return 'div';
  }

  return processedTagName;
}

function serializeElementNode(
  n: RRElement,
  options: {
    doc: RRDocument;
    mirror: Mirror;
    rootId: number | undefined;
  },
): serializedNode | false {
  const { mirror, rootId } = options;
  const tagName = getValidTagName(n);
  const attributes: attributes = n.attributes;
  // media elements
  if (tagName === 'audio' || tagName === 'video') {
    attributes.rr_mediaState = (n as RRMediaElement).paused
      ? 'paused'
      : 'played';
    attributes.rr_mediaCurrentTime = (n as RRMediaElement).currentTime || '';
  }
  if (n.scrollLeft) {
    attributes.rr_scrollLeft = n.scrollLeft;
  }
  if (n.scrollTop) {
    attributes.rr_scrollTop = n.scrollTop;
  }

  if (tagName == 'iframe' && !(n as RRIFrameElement).contentDocument) {
    // we can't record it directly as we can't see into it
    // preserve the src attribute so a decision can be taken at replay time
    attributes.rr_src = attributes.src;
  }

  const meta = mirror.getMeta(n);
  const result: serializedNode = {
    type: NodeType.Element,
    tagName,
    attributes,
    childNodes: [],
    isSVG: (meta as elementNode).isSVG,
    rootId,
  };
  if ((meta as elementNode).needBlock !== undefined)
    result.needBlock = (meta as elementNode).needBlock;
  return result;
}

export function serializeNodeWithId(
  n: RRNode,
  options: {
    doc: RRDocument;
    mirror: Mirror;
    skipChild: boolean;
    onSerialize?: (n: RRNode) => unknown;
    onIframeLoad?: (
      iframeNode: RRIFrameElement,
      node: serializedNodeWithId,
    ) => unknown;
    isShadowDom?: boolean;
  },
): serializedNodeWithId | null {
  const {
    doc,
    mirror,
    skipChild = false,
    onSerialize,
    onIframeLoad,
    isShadowDom = false,
  } = options;
  const oldMeta = mirror.getMeta(n);
  // This node doesn't exist in the original web page.
  if (!oldMeta || oldMeta.id < 0) return null;

  const _serializedNode = serializeNode(n, {
    doc,
    mirror,
  });
  if (!_serializedNode) {
    // TODO: dev only
    console.warn(n, 'not serialized');
    return null;
  }
  const serializedNode = Object.assign(_serializedNode, { id: oldMeta.id });

  if (onSerialize) {
    onSerialize(n);
  }

  const recordChild = !skipChild;

  if (
    (serializedNode.type === NodeType.Document ||
      serializedNode.type === NodeType.Element) &&
    recordChild
  ) {
    const bypassOptions = {
      doc,
      mirror,
      skipChild,
      onSerialize,
      onIframeLoad,
      isShadowDom,
    };
    for (const childN of Array.from(n.childNodes)) {
      const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
      if (serializedChildNode) {
        serializedNode.childNodes.push(serializedChildNode);
      }
    }

    if (n.RRNodeType === NodeType.Element && (n as RRElement).shadowRoot) {
      serializedNode.isShadowHost = true;
      const shadowRoot = (n as RRElement).shadowRoot;
      if (shadowRoot) {
        bypassOptions.isShadowDom = true;
        for (const childN of Array.from(shadowRoot.childNodes)) {
          const serializedChildNode = serializeNodeWithId(
            childN,
            bypassOptions,
          );
          if (serializedChildNode) {
            serializedChildNode.isShadow = true;
            serializedNode.childNodes.push(serializedChildNode);
          }
        }
      }
    }
  }

  if (isShadowDom) serializedNode.isShadow = true;

  if (
    serializedNode.type === NodeType.Element &&
    serializedNode.tagName === 'iframe'
  ) {
    const iframeDoc = (n as RRIFrameElement).contentDocument;
    if (iframeDoc) {
      const serializedIframeNode = serializeNodeWithId(iframeDoc, {
        doc: iframeDoc,
        mirror,
        skipChild: false,
        onSerialize,
        onIframeLoad,
      });
      if (serializedIframeNode && onIframeLoad)
        onIframeLoad(n as RRIFrameElement, serializedIframeNode);
    }
  }

  return serializedNode;
}

export function snapshot(
  n: RRDocument,
  options?: {
    mirror?: Mirror;
    skipChild?: boolean;
    onSerialize?: (n: RRNode) => unknown;
    onIframeLoad?: (
      iframeNode: RRIFrameElement,
      node: serializedNodeWithId,
    ) => unknown;
  },
): serializedNodeWithId | null {
  const { mirror = new Mirror(), onSerialize, onIframeLoad } = options || {};
  return serializeNodeWithId(n, {
    doc: n,
    mirror,
    skipChild: false,
    onSerialize,
    onIframeLoad,
  });
}

export default snapshot;
