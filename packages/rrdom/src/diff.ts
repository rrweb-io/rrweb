import { NodeType as RRNodeType, Mirror as NodeMirror } from 'rrweb-snapshot';
import type {
  canvasMutationData,
  canvasEventWithTime,
  inputData,
  scrollData,
  styleDeclarationData,
  styleSheetRuleData,
} from '@rrweb/types';
import type {
  IRRCDATASection,
  IRRComment,
  IRRDocument,
  IRRDocumentType,
  IRRElement,
  IRRNode,
  IRRText,
} from './document';
import type {
  RRCanvasElement,
  RRElement,
  RRIFrameElement,
  RRMediaElement,
  RRStyleElement,
  RRDocument,
  Mirror,
} from '.';

const NAMESPACES: Record<string, string> = {
  svg: 'http://www.w3.org/2000/svg',
  'xlink:href': 'http://www.w3.org/1999/xlink',
  xmlns: 'http://www.w3.org/2000/xmlns/',
};

// camel case svg element tag names
const SVGTagMap: Record<string, string> = {
  altglyph: 'altGlyph',
  altglyphdef: 'altGlyphDef',
  altglyphitem: 'altGlyphItem',
  animatecolor: 'animateColor',
  animatemotion: 'animateMotion',
  animatetransform: 'animateTransform',
  clippath: 'clipPath',
  feblend: 'feBlend',
  fecolormatrix: 'feColorMatrix',
  fecomponenttransfer: 'feComponentTransfer',
  fecomposite: 'feComposite',
  feconvolvematrix: 'feConvolveMatrix',
  fediffuselighting: 'feDiffuseLighting',
  fedisplacementmap: 'feDisplacementMap',
  fedistantlight: 'feDistantLight',
  fedropshadow: 'feDropShadow',
  feflood: 'feFlood',
  fefunca: 'feFuncA',
  fefuncb: 'feFuncB',
  fefuncg: 'feFuncG',
  fefuncr: 'feFuncR',
  fegaussianblur: 'feGaussianBlur',
  feimage: 'feImage',
  femerge: 'feMerge',
  femergenode: 'feMergeNode',
  femorphology: 'feMorphology',
  feoffset: 'feOffset',
  fepointlight: 'fePointLight',
  fespecularlighting: 'feSpecularLighting',
  fespotlight: 'feSpotLight',
  fetile: 'feTile',
  feturbulence: 'feTurbulence',
  foreignobject: 'foreignObject',
  glyphref: 'glyphRef',
  lineargradient: 'linearGradient',
  radialgradient: 'radialGradient',
};

export type ReplayerHandler = {
  mirror: NodeMirror;
  applyCanvas: (
    canvasEvent: canvasEventWithTime,
    canvasMutationData: canvasMutationData,
    target: HTMLCanvasElement,
  ) => void;
  applyInput: (data: inputData) => void;
  applyScroll: (data: scrollData, isSync: boolean) => void;
  applyStyleSheetMutation: (
    data: styleDeclarationData | styleSheetRuleData,
    styleSheet: CSSStyleSheet,
  ) => void;
};

export function diff(
  oldTree: Node,
  newTree: IRRNode,
  replayer: ReplayerHandler,
  rrnodeMirror?: Mirror,
) {
  rrnodeMirror =
    rrnodeMirror ||
    (newTree as RRDocument).mirror ||
    (newTree.ownerDocument as RRDocument).mirror;

  // If the Mirror data has some flaws, the diff function may throw errors. We check the node consistency here to make it robust.
  if (!sameNodeType(oldTree, newTree)) {
    const calibratedOldTree = createOrGetNode(
      newTree,
      replayer.mirror,
      rrnodeMirror,
    );
    oldTree.parentNode?.replaceChild(calibratedOldTree, oldTree);
    oldTree = calibratedOldTree;
  }

  // If the oldTree is an iframe element and its document content is automatically mounted by browsers, we need to remove them to avoid unexpected behaviors. e.g. Selector matches may be case insensitive.
  if (oldTree.nodeName === 'IFRAME') {
    const iframeDoc = (oldTree as HTMLIFrameElement).contentDocument;
    if (
      iframeDoc &&
      iframeDoc.documentElement &&
      replayer.mirror.getId(iframeDoc.documentElement) < 0
    ) {
      iframeDoc.close();
      iframeDoc.open();
    }
  }

  const oldChildren = oldTree.childNodes;
  const newChildren = newTree.childNodes;

  if (oldChildren.length > 0 || newChildren.length > 0) {
    diffChildren(
      Array.from(oldChildren),
      newChildren,
      oldTree,
      replayer,
      rrnodeMirror,
    );
  }

  let inputDataToApply = null,
    scrollDataToApply = null;
  switch (newTree.RRNodeType) {
    case RRNodeType.Document: {
      const newRRDocument = newTree as IRRDocument;
      scrollDataToApply = (newRRDocument as RRDocument).scrollData;
      break;
    }
    case RRNodeType.Element: {
      const oldElement = oldTree as HTMLElement;
      const newRRElement = newTree as IRRElement;
      diffProps(oldElement, newRRElement, rrnodeMirror);
      scrollDataToApply = (newRRElement as RRElement).scrollData;
      inputDataToApply = (newRRElement as RRElement).inputData;
      switch (newRRElement.tagName) {
        case 'AUDIO':
        case 'VIDEO': {
          const oldMediaElement = oldTree as HTMLMediaElement;
          const newMediaRRElement = newRRElement as RRMediaElement;
          if (newMediaRRElement.paused !== undefined)
            newMediaRRElement.paused
              ? void oldMediaElement.pause()
              : void oldMediaElement.play();
          if (newMediaRRElement.muted !== undefined)
            oldMediaElement.muted = newMediaRRElement.muted;
          if (newMediaRRElement.volume !== undefined)
            oldMediaElement.volume = newMediaRRElement.volume;
          if (newMediaRRElement.currentTime !== undefined)
            oldMediaElement.currentTime = newMediaRRElement.currentTime;
          if (newMediaRRElement.playbackRate !== undefined)
            oldMediaElement.playbackRate = newMediaRRElement.playbackRate;
          break;
        }
        case 'CANVAS':
          {
            const rrCanvasElement = newTree as RRCanvasElement;
            // This canvas element is created with initial data in an iframe element. https://github.com/rrweb-io/rrweb/pull/944
            if (rrCanvasElement.rr_dataURL !== null) {
              const image = document.createElement('img');
              image.onload = () => {
                const ctx = (oldElement as HTMLCanvasElement).getContext('2d');
                if (ctx) {
                  ctx.drawImage(image, 0, 0, image.width, image.height);
                }
              };
              image.src = rrCanvasElement.rr_dataURL;
            }
            rrCanvasElement.canvasMutations.forEach((canvasMutation) =>
              replayer.applyCanvas(
                canvasMutation.event,
                canvasMutation.mutation,
                oldTree as HTMLCanvasElement,
              ),
            );
          }
          break;
        case 'STYLE':
          {
            const styleSheet = (oldElement as HTMLStyleElement).sheet;
            styleSheet &&
              (newTree as RRStyleElement).rules.forEach((data) =>
                replayer.applyStyleSheetMutation(data, styleSheet),
              );
          }
          break;
      }
      if (newRRElement.shadowRoot) {
        if (!oldElement.shadowRoot) oldElement.attachShadow({ mode: 'open' });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const oldChildren = oldElement.shadowRoot!.childNodes;
        const newChildren = newRRElement.shadowRoot.childNodes;
        if (oldChildren.length > 0 || newChildren.length > 0)
          diffChildren(
            Array.from(oldChildren),
            newChildren,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            oldElement.shadowRoot!,
            replayer,
            rrnodeMirror,
          );
      }
      break;
    }
    case RRNodeType.Text:
    case RRNodeType.Comment:
    case RRNodeType.CDATA:
      if (
        oldTree.textContent !==
        (newTree as IRRText | IRRComment | IRRCDATASection).data
      )
        oldTree.textContent = (newTree as
          | IRRText
          | IRRComment
          | IRRCDATASection).data;
      break;
    default:
  }

  scrollDataToApply && replayer.applyScroll(scrollDataToApply, true);
  /**
   * Input data need to get applied after all children of this node are updated.
   * Otherwise when we set a value for a select element whose options are empty, the value won't actually update.
   */
  inputDataToApply && replayer.applyInput(inputDataToApply);

  // IFrame element doesn't have child nodes.
  if (newTree.nodeName === 'IFRAME') {
    const oldContentDocument = (oldTree as HTMLIFrameElement).contentDocument;
    const newIFrameElement = newTree as RRIFrameElement;
    // If the iframe is cross-origin, the contentDocument will be null.
    if (oldContentDocument) {
      const sn = rrnodeMirror.getMeta(newIFrameElement.contentDocument);
      if (sn) {
        replayer.mirror.add(oldContentDocument, { ...sn });
      }
      diff(
        oldContentDocument,
        newIFrameElement.contentDocument,
        replayer,
        rrnodeMirror,
      );
    }
  }
}

function diffProps(
  oldTree: HTMLElement,
  newTree: IRRElement,
  rrnodeMirror: Mirror,
) {
  const oldAttributes = oldTree.attributes;
  const newAttributes = newTree.attributes;

  for (const name in newAttributes) {
    const newValue = newAttributes[name];
    const sn = rrnodeMirror.getMeta(newTree);
    if (sn && 'isSVG' in sn && sn.isSVG && NAMESPACES[name])
      oldTree.setAttributeNS(NAMESPACES[name], name, newValue);
    else if (newTree.tagName === 'CANVAS' && name === 'rr_dataURL') {
      const image = document.createElement('img');
      image.src = newValue;
      image.onload = () => {
        const ctx = (oldTree as HTMLCanvasElement).getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0, image.width, image.height);
        }
      };
    } else oldTree.setAttribute(name, newValue);
  }

  for (const { name } of Array.from(oldAttributes))
    if (!(name in newAttributes)) oldTree.removeAttribute(name);

  newTree.scrollLeft && (oldTree.scrollLeft = newTree.scrollLeft);
  newTree.scrollTop && (oldTree.scrollTop = newTree.scrollTop);
}

function diffChildren(
  oldChildren: (Node | undefined)[],
  newChildren: IRRNode[],
  parentNode: Node,
  replayer: ReplayerHandler,
  rrnodeMirror: Mirror,
) {
  let oldStartIndex = 0,
    oldEndIndex = oldChildren.length - 1,
    newStartIndex = 0,
    newEndIndex = newChildren.length - 1;
  let oldStartNode = oldChildren[oldStartIndex],
    oldEndNode = oldChildren[oldEndIndex],
    newStartNode = newChildren[newStartIndex],
    newEndNode = newChildren[newEndIndex];
  let oldIdToIndex: Record<number, number> | undefined = undefined,
    indexInOld;
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    const oldStartId = replayer.mirror.getId(oldStartNode);
    const oldEndId = replayer.mirror.getId(oldEndNode);
    const newStartId = rrnodeMirror.getId(newStartNode);
    const newEndId = rrnodeMirror.getId(newEndNode);

    // rrdom contains elements with negative ids, we don't want to accidentally match those to a mirror mismatch (-1) id.
    // Negative oldStartId happen when nodes are not in the mirror, but are in the DOM.
    // eg.iframes come with a document, html, head and body nodes.
    // thats why below we always check if an id is negative.

    if (oldStartNode === undefined) {
      oldStartNode = oldChildren[++oldStartIndex];
    } else if (oldEndNode === undefined) {
      oldEndNode = oldChildren[--oldEndIndex];
    } else if (
      oldStartId !== -1 &&
      // same first element?
      oldStartId === newStartId
    ) {
      diff(oldStartNode, newStartNode, replayer, rrnodeMirror);
      oldStartNode = oldChildren[++oldStartIndex];
      newStartNode = newChildren[++newStartIndex];
    } else if (
      oldEndId !== -1 &&
      // same last element?
      oldEndId === newEndId
    ) {
      diff(oldEndNode, newEndNode, replayer, rrnodeMirror);
      oldEndNode = oldChildren[--oldEndIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (
      oldStartId !== -1 &&
      // is the first old element the same as the last new element?
      oldStartId === newEndId
    ) {
      try {
        parentNode.insertBefore(oldStartNode, oldEndNode.nextSibling);
      } catch (e) {
        console.warn(e);
      }
      diff(oldStartNode, newEndNode, replayer, rrnodeMirror);
      oldStartNode = oldChildren[++oldStartIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (
      oldEndId !== -1 &&
      // is the last old element the same as the first new element?
      oldEndId === newStartId
    ) {
      try {
        parentNode.insertBefore(oldEndNode, oldStartNode);
      } catch (e) {
        console.warn(e);
      }
      diff(oldEndNode, newStartNode, replayer, rrnodeMirror);
      oldEndNode = oldChildren[--oldEndIndex];
      newStartNode = newChildren[++newStartIndex];
    } else {
      // none of the elements matched

      if (!oldIdToIndex) {
        oldIdToIndex = {};
        for (let i = oldStartIndex; i <= oldEndIndex; i++) {
          const oldChild = oldChildren[i];
          if (oldChild && replayer.mirror.hasNode(oldChild))
            oldIdToIndex[replayer.mirror.getId(oldChild)] = i;
        }
      }
      indexInOld = oldIdToIndex[rrnodeMirror.getId(newStartNode)];
      if (indexInOld) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const nodeToMove = oldChildren[indexInOld]!;
        try {
          parentNode.insertBefore(nodeToMove, oldStartNode);
        } catch (e) {
          console.warn(e);
        }
        diff(nodeToMove, newStartNode, replayer, rrnodeMirror);
        oldChildren[indexInOld] = undefined;
      } else {
        const newNode = createOrGetNode(
          newStartNode,
          replayer.mirror,
          rrnodeMirror,
        );

        /**
         * A mounted iframe element has an automatically created HTML element.
         * We should delete it before insert a serialized one. Otherwise, an error 'Only one element on document allowed' will be thrown.
         */
        if (
          parentNode.nodeName === '#document' &&
          replayer.mirror.getMeta(newNode)?.type === RRNodeType.Element &&
          (parentNode as Document).documentElement
        ) {
          parentNode.removeChild((parentNode as Document).documentElement);
          oldChildren[oldStartIndex] = undefined;
          oldStartNode = undefined;
        }
        try {
          parentNode.insertBefore(newNode, oldStartNode || null);
        } catch (e) {
          console.warn(e);
        }
        diff(newNode, newStartNode, replayer, rrnodeMirror);
      }
      newStartNode = newChildren[++newStartIndex];
    }
  }
  if (oldStartIndex > oldEndIndex) {
    const referenceRRNode = newChildren[newEndIndex + 1];
    let referenceNode = null;
    if (referenceRRNode)
      parentNode.childNodes.forEach((child) => {
        if (
          replayer.mirror.getId(child) === rrnodeMirror.getId(referenceRRNode)
        )
          referenceNode = child;
      });
    for (; newStartIndex <= newEndIndex; ++newStartIndex) {
      const newNode = createOrGetNode(
        newChildren[newStartIndex],
        replayer.mirror,
        rrnodeMirror,
      );
      try {
        parentNode.insertBefore(newNode, referenceNode);
      } catch (e) {
        console.warn(e);
      }
      diff(newNode, newChildren[newStartIndex], replayer, rrnodeMirror);
    }
  } else if (newStartIndex > newEndIndex) {
    for (; oldStartIndex <= oldEndIndex; oldStartIndex++) {
      const node = oldChildren[oldStartIndex];
      if (node) {
        try {
          parentNode.removeChild(node);
        } catch (e) {
          console.warn(e);
        }
        replayer.mirror.removeNodeFromMap(node);
      }
    }
  }
}

export function createOrGetNode(
  rrNode: IRRNode,
  domMirror: NodeMirror,
  rrnodeMirror: Mirror,
): Node {
  const nodeId = rrnodeMirror.getId(rrNode);
  const sn = rrnodeMirror.getMeta(rrNode);
  let node: Node | null = null;
  // negative ids shouldn't be compared accross mirrors
  if (nodeId > -1) node = domMirror.getNode(nodeId);
  if (node !== null && sameNodeType(node, rrNode)) return node;
  switch (rrNode.RRNodeType) {
    case RRNodeType.Document:
      node = new Document();
      break;
    case RRNodeType.DocumentType:
      node = document.implementation.createDocumentType(
        (rrNode as IRRDocumentType).name,
        (rrNode as IRRDocumentType).publicId,
        (rrNode as IRRDocumentType).systemId,
      );
      break;
    case RRNodeType.Element: {
      let tagName = (rrNode as IRRElement).tagName.toLowerCase();
      tagName = SVGTagMap[tagName] || tagName;
      if (sn && 'isSVG' in sn && sn?.isSVG) {
        node = document.createElementNS(NAMESPACES['svg'], tagName);
      } else node = document.createElement((rrNode as IRRElement).tagName);
      break;
    }
    case RRNodeType.Text:
      node = document.createTextNode((rrNode as IRRText).data);
      break;
    case RRNodeType.Comment:
      node = document.createComment((rrNode as IRRComment).data);
      break;
    case RRNodeType.CDATA:
      node = document.createCDATASection((rrNode as IRRCDATASection).data);
      break;
  }

  if (sn) domMirror.add(node, { ...sn });
  return node;
}

/**
 * To check whether two nodes are the same type of node. If they are both Elements, check wether their tagNames are same or not.
 */
export function sameNodeType(node1: Node, node2: IRRNode) {
  if (node1.nodeType !== node2.nodeType) return false;
  return (
    node1.nodeType !== node1.ELEMENT_NODE ||
    (node1 as HTMLElement).tagName.toUpperCase() ===
      (node2 as IRRElement).tagName
  );
}
