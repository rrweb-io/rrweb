import { elementNode, INode, NodeType as RRNodeType } from 'rrweb-snapshot';
import type {
  canvasMutationData,
  incrementalSnapshotEvent,
  inputData,
  Mirror,
  scrollData,
} from 'rrweb/src/types';
import {
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
  RRDocument,
  RRElement,
  RRIFrameElement,
  RRMediaElement,
  RRStyleElement,
} from './virtual-dom';

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
  mirror: Mirror;
  applyCanvas: (
    canvasEvent: incrementalSnapshotEvent & {
      timestamp: number;
      delay?: number | undefined;
    },
    canvasMutationData: canvasMutationData,
    target: HTMLCanvasElement,
  ) => void;
  applyInput: (data: inputData) => void;
  applyScroll: (data: scrollData, isSync: boolean) => void;
};

export function diff(
  oldTree: INode,
  newTree: IRRNode,
  replayer: ReplayerHandler,
) {
  let inputDataToApply = null,
    scrollDataToApply = null;
  switch (newTree.RRNodeType) {
    case RRNodeType.Document:
      const newRRDocument = newTree as IRRDocument;
      scrollDataToApply = (newRRDocument as RRDocument).scrollData;
      break;
    case RRNodeType.Element:
      const oldElement = (oldTree as Node) as HTMLElement;
      const newRRElement = newTree as IRRElement;
      diffProps(oldElement, newRRElement);
      scrollDataToApply = (newRRElement as RRElement).scrollData;
      inputDataToApply = (newRRElement as RRElement).inputData;
      switch (newRRElement.tagName) {
        case 'AUDIO':
        case 'VIDEO':
          const oldMediaElement = (oldTree as Node) as HTMLMediaElement;
          const newMediaRRElement = newRRElement as RRMediaElement;
          if (newMediaRRElement.paused !== undefined)
            newMediaRRElement.paused
              ? oldMediaElement.pause()
              : oldMediaElement.play();
          if (newMediaRRElement.muted !== undefined)
            oldMediaElement.muted = newMediaRRElement.muted;
          if (newMediaRRElement.volume !== undefined)
            oldMediaElement.volume = newMediaRRElement.volume;
          if (newMediaRRElement.currentTime !== undefined)
            oldMediaElement.currentTime = newMediaRRElement.currentTime;
          break;
        case 'CANVAS':
          (newTree as RRCanvasElement).canvasMutations.forEach(
            (canvasMutation) =>
              replayer.applyCanvas(
                canvasMutation.event,
                canvasMutation.mutation,
                (oldTree as Node) as HTMLCanvasElement,
              ),
          );
          break;
        case 'STYLE':
          applyVirtualStyleRulesToNode(
            oldElement as HTMLStyleElement,
            (newTree as RRStyleElement).rules,
          );
          break;
      }
      if (newRRElement.shadowRoot) {
        if (!oldElement.shadowRoot) oldElement.attachShadow({ mode: 'open' });
        const oldChildren = oldElement.shadowRoot!.childNodes;
        const newChildren = newRRElement.shadowRoot.childNodes;
        if (oldChildren.length > 0 || newChildren.length > 0)
          diffChildren(
            (Array.from(oldChildren) as unknown) as INode[],
            newChildren,
            (oldElement.shadowRoot! as unknown) as INode,
            replayer,
          );
      }
      break;
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
  const oldChildren = oldTree.childNodes;
  const newChildren = newTree.childNodes;
  if (oldChildren.length > 0 || newChildren.length > 0) {
    diffChildren(
      (Array.from(oldChildren) as unknown) as INode[],
      newChildren,
      oldTree,
      replayer,
    );
  }
  // IFrame element doesn't have child nodes.
  if (
    newTree.RRNodeType === RRNodeType.Element &&
    (newTree as IRRElement).tagName === 'IFRAME'
  ) {
    const oldContentDocument = (((oldTree as Node) as HTMLIFrameElement)
      .contentDocument as unknown) as INode;
    const newIFrameElement = newTree as RRIFrameElement;
    // If the iframe is cross-origin, the contentDocument will be null.
    if (oldContentDocument) {
      if (newIFrameElement.contentDocument.__sn) {
        oldContentDocument.__sn = newIFrameElement.contentDocument.__sn;
        replayer.mirror.map[
          newIFrameElement.contentDocument.__sn.id
        ] = oldContentDocument;
      }
      diff(oldContentDocument, newIFrameElement.contentDocument, replayer);
    }
  }

  scrollDataToApply && replayer.applyScroll(scrollDataToApply, true);
  /**
   * Input data need to get applied after all children of this node are updated.
   * Otherwise when we set a value for a select element whose options are empty, the value won't actually update.
   */
  inputDataToApply && replayer.applyInput(inputDataToApply);
}

function diffProps(oldTree: HTMLElement, newTree: IRRElement) {
  const oldAttributes = oldTree.attributes;
  const newAttributes = newTree.attributes;

  for (const name in newAttributes) {
    const newValue = newAttributes[name];
    if ((newTree.__sn as elementNode).isSVG && NAMESPACES[name])
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
  oldChildren: (INode | undefined)[],
  newChildren: IRRNode[],
  parentNode: INode,
  replayer: ReplayerHandler,
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
    if (oldStartNode === undefined) {
      oldStartNode = oldChildren[++oldStartIndex];
    } else if (oldEndNode === undefined) {
      oldEndNode = oldChildren[--oldEndIndex];
    } else if (oldStartNode.__sn?.id === newStartNode.__sn.id) {
      diff(oldStartNode, newStartNode, replayer);
      oldStartNode = oldChildren[++oldStartIndex];
      newStartNode = newChildren[++newStartIndex];
    } else if (oldEndNode.__sn?.id === newEndNode.__sn.id) {
      diff(oldEndNode, newEndNode, replayer);
      oldEndNode = oldChildren[--oldEndIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (oldStartNode.__sn?.id === newEndNode.__sn.id) {
      parentNode.insertBefore(oldStartNode, oldEndNode.nextSibling);
      diff(oldStartNode, newEndNode, replayer);
      oldStartNode = oldChildren[++oldStartIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (oldEndNode.__sn?.id === newStartNode.__sn.id) {
      parentNode.insertBefore(oldEndNode, oldStartNode);
      diff(oldEndNode, newStartNode, replayer);
      oldEndNode = oldChildren[--oldEndIndex];
      newStartNode = newChildren[++newStartIndex];
    } else {
      if (!oldIdToIndex) {
        oldIdToIndex = {};
        for (let i = oldStartIndex; i <= oldEndIndex; i++) {
          const oldChild = oldChildren[i];
          if (oldChild?.__sn) oldIdToIndex[oldChild.__sn.id] = i;
        }
      }
      indexInOld = oldIdToIndex[newStartNode.__sn.id];
      if (indexInOld) {
        const nodeToMove = oldChildren[indexInOld]!;
        parentNode.insertBefore(nodeToMove, oldStartNode);
        diff(nodeToMove, newStartNode, replayer);
        oldChildren[indexInOld] = undefined;
      } else {
        const newNode = createOrGetNode(newStartNode, replayer.mirror);

        /**
         * A mounted iframe element has an automatically created HTML element.
         * We should delete it before insert a serialized one. Otherwise, an error 'Only one element on document allowed' will be thrown.
         */
        if (
          parentNode.__sn.type === RRNodeType.Document &&
          newNode.__sn.type === RRNodeType.Element &&
          ((parentNode as Node) as Document).documentElement
        ) {
          parentNode.removeChild(
            ((parentNode as Node) as Document).documentElement,
          );
          oldChildren[oldStartIndex] = undefined;
          oldStartNode = undefined;
        }
        parentNode.insertBefore(newNode, oldStartNode || null);
        diff(newNode, newStartNode, replayer);
      }
      newStartNode = newChildren[++newStartIndex];
    }
  }
  if (oldStartIndex > oldEndIndex) {
    const referenceRRNode = newChildren[newEndIndex + 1];
    let referenceNode = null;
    if (referenceRRNode)
      parentNode.childNodes.forEach((child) => {
        if (((child as unknown) as INode).__sn.id === referenceRRNode.__sn.id)
          referenceNode = child;
      });
    for (; newStartIndex <= newEndIndex; ++newStartIndex) {
      const newNode = createOrGetNode(
        newChildren[newStartIndex],
        replayer.mirror,
      );
      parentNode.insertBefore(newNode, referenceNode);
      diff(newNode, newChildren[newStartIndex], replayer);
    }
  } else if (newStartIndex > newEndIndex) {
    for (; oldStartIndex <= oldEndIndex; oldStartIndex++) {
      const node = oldChildren[oldStartIndex];
      if (node) {
        parentNode.removeChild(node);
        replayer.mirror.removeNodeFromMap(node);
      }
    }
  }
}

export function createOrGetNode(rrNode: IRRNode, mirror: Mirror): INode {
  let node = mirror.getNode(rrNode.__sn.id);
  if (node !== null) return node;
  switch (rrNode.RRNodeType) {
    case RRNodeType.Document:
      node = (new Document() as unknown) as INode;
      break;
    case RRNodeType.DocumentType:
      node = (document.implementation.createDocumentType(
        (rrNode as IRRDocumentType).name,
        (rrNode as IRRDocumentType).publicId,
        (rrNode as IRRDocumentType).systemId,
      ) as unknown) as INode;
      break;
    case RRNodeType.Element:
      let tagName = (rrNode as IRRElement).tagName.toLowerCase();
      tagName = SVGTagMap[tagName] || tagName;
      if ((rrNode.__sn as elementNode).isSVG) {
        node = (document.createElementNS(
          NAMESPACES['svg'],
          (rrNode as IRRElement).tagName.toLowerCase(),
        ) as unknown) as INode;
      } else
        node = (document.createElement(
          (rrNode as IRRElement).tagName,
        ) as unknown) as INode;
      break;
    case RRNodeType.Text:
      node = (document.createTextNode(
        (rrNode as IRRText).data,
      ) as unknown) as INode;
      break;
    case RRNodeType.Comment:
      node = (document.createComment(
        (rrNode as IRRComment).data,
      ) as unknown) as INode;
      break;
    case RRNodeType.CDATA:
      node = (document.createCDATASection(
        (rrNode as IRRCDATASection).data,
      ) as unknown) as INode;
      break;
  }
  node.__sn = { ...rrNode.__sn };
  mirror.map[rrNode.__sn.id] = node;
  return node;
}

export function getNestedRule(
  rules: CSSRuleList,
  position: number[],
): CSSGroupingRule {
  const rule = rules[position[0]] as CSSGroupingRule;
  if (position.length === 1) {
    return rule;
  } else {
    return getNestedRule(
      ((rule as CSSGroupingRule).cssRules[position[1]] as CSSGroupingRule)
        .cssRules,
      position.slice(2),
    );
  }
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

export function getPositionsAndIndex(nestedIndex: number[]) {
  const positions = [...nestedIndex];
  const index = positions.pop();
  return { positions, index };
}

export function applyVirtualStyleRulesToNode(
  styleNode: HTMLStyleElement,
  virtualStyleRules: VirtualStyleRules,
) {
  const sheet = styleNode.sheet!;

  virtualStyleRules.forEach((rule) => {
    if (rule.type === StyleRuleType.Insert) {
      try {
        if (Array.isArray(rule.index)) {
          const { positions, index } = getPositionsAndIndex(rule.index);
          const nestedRule = getNestedRule(sheet.cssRules, positions);
          nestedRule.insertRule(rule.cssText, index);
        } else {
          sheet.insertRule(rule.cssText, rule.index);
        }
      } catch (e) {
        /**
         * sometimes we may capture rules with browser prefix
         * insert rule with prefixs in other browsers may cause Error
         */
      }
    } else if (rule.type === StyleRuleType.Remove) {
      try {
        if (Array.isArray(rule.index)) {
          const { positions, index } = getPositionsAndIndex(rule.index);
          const nestedRule = getNestedRule(sheet.cssRules, positions);
          nestedRule.deleteRule(index || 0);
        } else {
          sheet.deleteRule(rule.index);
        }
      } catch (e) {
        /**
         * accessing styleSheet rules may cause SecurityError
         * for specific access control settings
         */
      }
    } else if (rule.type === StyleRuleType.SetProperty) {
      const nativeRule = (getNestedRule(
        sheet.cssRules,
        rule.index,
      ) as unknown) as CSSStyleRule;
      nativeRule.style.setProperty(rule.property, rule.value, rule.priority);
    } else if (rule.type === StyleRuleType.RemoveProperty) {
      const nativeRule = (getNestedRule(
        sheet.cssRules,
        rule.index,
      ) as unknown) as CSSStyleRule;
      nativeRule.style.removeProperty(rule.property);
    }
  });
}
