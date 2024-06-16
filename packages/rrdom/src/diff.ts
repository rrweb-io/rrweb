import {
  NodeType as RRNodeType,
  Mirror as NodeMirror,
  elementNode,
} from '@saola.ai/rrweb-snapshot';
import type {
  canvasMutationData,
  canvasEventWithTime,
  inputData,
  scrollData,
  styleDeclarationData,
  styleSheetRuleData,
} from '@saola.ai/rrweb-types';
import type {
  IRRCDATASection,
  IRRComment,
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
  // Similar to the `afterAppend` callback in the `rrweb-snapshot` package. It's a postorder traversal of the newly appended nodes.
  afterAppend?(node: Node, id: number): void;
};

// A set contains newly appended nodes. It's used to make sure the afterAppend callback can iterate newly appended nodes in the same traversal order as that in the `rrweb-snapshot` package.
let createdNodeSet: WeakSet<Node> | null = null;

/**
 * Make the old tree to have the same structure and properties as the new tree with the diff algorithm.
 * @param oldTree - The old tree to be modified.
 * @param newTree - The new tree which the old tree will be modified to.
 * @param replayer - A slimmed replayer instance including the mirror of the old tree.
 * @param rrnodeMirror - The mirror of the new tree.
 */
export function diff(
  oldTree: Node,
  newTree: IRRNode,
  replayer: ReplayerHandler,
  rrnodeMirror: Mirror = (newTree as RRDocument).mirror ||
    (newTree.ownerDocument as RRDocument).mirror,
) {
  oldTree = diffBeforeUpdatingChildren(
    oldTree,
    newTree,
    replayer,
    rrnodeMirror,
  );

  diffChildren(oldTree, newTree, replayer, rrnodeMirror);

  diffAfterUpdatingChildren(oldTree, newTree, replayer);
}

/**
 * Do some preparation work before updating the children of the old tree.
 */
function diffBeforeUpdatingChildren(
  oldTree: Node,
  newTree: IRRNode,
  replayer: ReplayerHandler,
  rrnodeMirror: Mirror,
) {
  if (replayer.afterAppend && !createdNodeSet) {
    createdNodeSet = new WeakSet();
    setTimeout(() => {
      createdNodeSet = null;
    }, 0);
  }
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
  switch (newTree.RRNodeType) {
    case RRNodeType.Document: {
      /**
       * Special cases for updating the document node:
       * Case 1: If the oldTree is the content document of an iframe element and its content (HTML, HEAD, and BODY) is automatically mounted by browsers, we need to remove them to avoid unexpected behaviors. e.g. Selector matches may be case insensitive.
       * Case 2: The newTree has a different serialized Id (a different document object), we need to reopen it and update the nodeMirror.
       */
      if (!nodeMatching(oldTree, newTree, replayer.mirror, rrnodeMirror)) {
        const newMeta = rrnodeMirror.getMeta(newTree);
        if (newMeta) {
          replayer.mirror.removeNodeFromMap(oldTree);
          (oldTree as Document).close();
          (oldTree as Document).open();
          replayer.mirror.add(oldTree, newMeta);
          createdNodeSet?.add(oldTree);
        }
      }
      break;
    }
    case RRNodeType.Element: {
      const oldElement = oldTree as HTMLElement;
      const newRRElement = newTree as IRRElement;
      switch (newRRElement.tagName) {
        case 'IFRAME': {
          const oldContentDocument = (oldTree as HTMLIFrameElement)
            .contentDocument;
          // If the iframe is cross-origin, the contentDocument will be null.
          if (!oldContentDocument) break;
          // IFrame element doesn't have child nodes, so here we update its content document separately.
          diff(
            oldContentDocument,
            (newTree as RRIFrameElement).contentDocument,
            replayer,
            rrnodeMirror,
          );
          break;
        }
      }
      if (newRRElement.shadowRoot) {
        if (!oldElement.shadowRoot) oldElement.attachShadow({ mode: 'open' });
        diffChildren(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          oldElement.shadowRoot!,
          newRRElement.shadowRoot,
          replayer,
          rrnodeMirror,
        );
      }
      /**
       * Attributes and styles of the old element need to be updated before updating its children because of an edge case:
       * `applyScroll` may fail in `diffAfterUpdatingChildren` when the height of a node when `applyScroll` is called may be incorrect if
       * 1. its parent node contains styles that affects the targeted node's height
       * 2. the CSS selector is targeting an attribute of the parent node
       * by running `diffProps` on the parent node before `diffChildren` is called,
       * we can ensure that the correct attributes (and therefore styles) have applied to parent nodes
       */
      diffProps(oldElement, newRRElement, rrnodeMirror);
      break;
    }
  }
  return oldTree;
}

/**
 * Finish the diff work after updating the children of the old tree.
 */
function diffAfterUpdatingChildren(
  oldTree: Node,
  newTree: IRRNode,
  replayer: ReplayerHandler,
) {
  switch (newTree.RRNodeType) {
    case RRNodeType.Document: {
      const scrollData = (newTree as RRDocument).scrollData;
      scrollData && replayer.applyScroll(scrollData, true);
      break;
    }
    case RRNodeType.Element: {
      const oldElement = oldTree as HTMLElement;
      const newRRElement = newTree as RRElement;
      newRRElement.scrollData &&
        replayer.applyScroll(newRRElement.scrollData, true);
      /**
       * Input data need to get applied after all children of this node are updated.
       * Otherwise when we set a value for a select element whose options are empty, the value won't actually update.
       */
      newRRElement.inputData && replayer.applyInput(newRRElement.inputData);
      switch (newRRElement.tagName) {
        case 'AUDIO':
        case 'VIDEO': {
          const oldMediaElement = oldTree as HTMLMediaElement;
          const newMediaRRElement = newRRElement as unknown as RRMediaElement;
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
          if (newMediaRRElement.loop !== undefined)
            oldMediaElement.loop = newMediaRRElement.loop;
          break;
        }
        case 'CANVAS': {
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
          break;
        }
        // Props of style elements have to be updated after all children are updated. Otherwise the props can be overwritten by textContent.
        case 'STYLE': {
          const styleSheet = (oldElement as HTMLStyleElement).sheet;
          styleSheet &&
            (newTree as RRStyleElement).rules.forEach((data) =>
              replayer.applyStyleSheetMutation(data, styleSheet),
            );
          break;
        }
      }
      break;
    }
    case RRNodeType.Text:
    case RRNodeType.Comment:
    case RRNodeType.CDATA: {
      if (
        oldTree.textContent !==
        (newTree as IRRText | IRRComment | IRRCDATASection).data
      )
        oldTree.textContent = (
          newTree as IRRText | IRRComment | IRRCDATASection
        ).data;
      break;
    }
  }
  if (createdNodeSet?.has(oldTree)) {
    createdNodeSet.delete(oldTree);
    replayer.afterAppend?.(oldTree, replayer.mirror.getId(oldTree));
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
    const sn = rrnodeMirror.getMeta(newTree) as elementNode | null;
    if (sn?.isSVG && NAMESPACES[name])
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
    } else if (newTree.tagName === 'IFRAME' && name === 'srcdoc') continue;
    else oldTree.setAttribute(name, newValue);
  }

  for (const { name } of Array.from(oldAttributes))
    if (!(name in newAttributes)) oldTree.removeAttribute(name);

  newTree.scrollLeft && (oldTree.scrollLeft = newTree.scrollLeft);
  newTree.scrollTop && (oldTree.scrollTop = newTree.scrollTop);
}

function diffChildren(
  oldTree: Node,
  newTree: IRRNode,
  replayer: ReplayerHandler,
  rrnodeMirror: Mirror,
) {
  const oldChildren: (Node | undefined)[] = Array.from(oldTree.childNodes);
  const newChildren = newTree.childNodes;
  if (oldChildren.length === 0 && newChildren.length === 0) return;
  let oldStartIndex = 0,
    oldEndIndex = oldChildren.length - 1,
    newStartIndex = 0,
    newEndIndex = newChildren.length - 1;
  let oldStartNode = oldChildren[oldStartIndex],
    oldEndNode = oldChildren[oldEndIndex],
    newStartNode = newChildren[newStartIndex],
    newEndNode = newChildren[newEndIndex];
  let oldIdToIndex: Record<number, number> | undefined = undefined,
    indexInOld: number | undefined = undefined;
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    if (oldStartNode === undefined) {
      oldStartNode = oldChildren[++oldStartIndex];
    } else if (oldEndNode === undefined) {
      oldEndNode = oldChildren[--oldEndIndex];
    } else if (
      // same first node?
      nodeMatching(oldStartNode, newStartNode, replayer.mirror, rrnodeMirror)
    ) {
      oldStartNode = oldChildren[++oldStartIndex];
      newStartNode = newChildren[++newStartIndex];
    } else if (
      // same last node?
      nodeMatching(oldEndNode, newEndNode, replayer.mirror, rrnodeMirror)
    ) {
      oldEndNode = oldChildren[--oldEndIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (
      // is the first old node the same as the last new node?
      nodeMatching(oldStartNode, newEndNode, replayer.mirror, rrnodeMirror)
    ) {
      try {
        oldTree.insertBefore(oldStartNode, oldEndNode.nextSibling);
      } catch (e) {
        console.warn(e);
      }
      oldStartNode = oldChildren[++oldStartIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (
      // is the last old node the same as the first new node?
      nodeMatching(oldEndNode, newStartNode, replayer.mirror, rrnodeMirror)
    ) {
      try {
        oldTree.insertBefore(oldEndNode, oldStartNode);
      } catch (e) {
        console.warn(e);
      }
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
      const nodeToMove = oldChildren[indexInOld];
      if (
        indexInOld !== undefined &&
        nodeToMove &&
        nodeMatching(nodeToMove, newStartNode, replayer.mirror, rrnodeMirror)
      ) {
        try {
          oldTree.insertBefore(nodeToMove, oldStartNode);
        } catch (e) {
          console.warn(e);
        }
        oldChildren[indexInOld] = undefined;
      } else {
        const newNode = createOrGetNode(
          newStartNode,
          replayer.mirror,
          rrnodeMirror,
        );

        if (
          oldTree.nodeName === '#document' &&
          oldStartNode &&
          /**
           * Special case 1: one document isn't allowed to have two doctype nodes at the same time, so we need to remove the old one first before inserting the new one.
           * How this case happens: A parent document in the old tree already has a doctype node with an id e.g. #1. A new full snapshot rebuilds the replayer with a new doctype node with another id #2. According to the algorithm, the new doctype node will be inserted before the old one, which is not allowed by the Document standard.
           */
          ((newNode.nodeType === newNode.DOCUMENT_TYPE_NODE &&
            oldStartNode.nodeType === oldStartNode.DOCUMENT_TYPE_NODE) ||
            /**
             * Special case 2: one document isn't allowed to have two HTMLElements at the same time, so we need to remove the old one first before inserting the new one.
             * How this case happens: A mounted iframe element has an automatically created HTML element. We should delete it before inserting a serialized one. Otherwise, an error 'Only one element on document allowed' will be thrown.
             */
            (newNode.nodeType === newNode.ELEMENT_NODE &&
              oldStartNode.nodeType === oldStartNode.ELEMENT_NODE))
        ) {
          oldTree.removeChild(oldStartNode);
          replayer.mirror.removeNodeFromMap(oldStartNode);
          oldStartNode = oldChildren[++oldStartIndex];
        }

        try {
          oldTree.insertBefore(newNode, oldStartNode || null);
        } catch (e) {
          console.warn(e);
        }
      }
      newStartNode = newChildren[++newStartIndex];
    }
  }
  if (oldStartIndex > oldEndIndex) {
    const referenceRRNode = newChildren[newEndIndex + 1];
    let referenceNode: Node | null = null;
    if (referenceRRNode)
      referenceNode = replayer.mirror.getNode(
        rrnodeMirror.getId(referenceRRNode),
      );
    for (; newStartIndex <= newEndIndex; ++newStartIndex) {
      const newNode = createOrGetNode(
        newChildren[newStartIndex],
        replayer.mirror,
        rrnodeMirror,
      );
      try {
        oldTree.insertBefore(newNode, referenceNode);
      } catch (e) {
        console.warn(e);
      }
    }
  } else if (newStartIndex > newEndIndex) {
    for (; oldStartIndex <= oldEndIndex; oldStartIndex++) {
      const node = oldChildren[oldStartIndex];
      if (!node || node.parentNode !== oldTree) continue;
      try {
        oldTree.removeChild(node);
        replayer.mirror.removeNodeFromMap(node);
      } catch (e) {
        console.warn(e);
      }
    }
  }

  // Recursively diff the children of the old tree and the new tree with their props and deeper structures.
  let oldChild = oldTree.firstChild;
  let newChild = newTree.firstChild;
  while (oldChild !== null && newChild !== null) {
    diff(oldChild, newChild, replayer, rrnodeMirror);
    oldChild = oldChild.nextSibling;
    newChild = newChild.nextSibling;
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
  try {
    createdNodeSet?.add(node);
  } catch (e) {
    // Just for safety concern.
  }
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

/**
 * To check whether two nodes are matching. If so, they are supposed to have the same serialized Id and node type. If they are both Elements, their tagNames should be the same as well. Otherwise, they are not matching.
 */
export function nodeMatching(
  node1: Node,
  node2: IRRNode,
  domMirror: NodeMirror,
  rrdomMirror: Mirror,
): boolean {
  const node1Id = domMirror.getId(node1);
  const node2Id = rrdomMirror.getId(node2);
  // rrdom contains elements with negative ids, we don't want to accidentally match those to a mirror mismatch (-1) id.
  // Negative oldStartId happen when nodes are not in the mirror, but are in the DOM.
  // eg.iframes come with a document, html, head and body nodes.
  // thats why below we always check if an id is negative.
  if (node1Id === -1 || node1Id !== node2Id) return false;
  return sameNodeType(node1, node2);
}
