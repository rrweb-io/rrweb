import { NodeType as RRNodeType, Mirror as NodeMirror } from 'rrweb-snapshot';
import type {
  canvasMutationData,
  canvasEventWithTime,
  inputData,
  scrollData,
} from 'rrweb/src/types';
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
};

export function diff(
  oldTree: Node,
  newTree: IRRNode,
  replayer: ReplayerHandler,
  rrnodeMirror?: Mirror,
) {
  const oldChildren = oldTree.childNodes;
  const newChildren = newTree.childNodes;
  rrnodeMirror =
    rrnodeMirror ||
    (newTree as RRDocument).mirror ||
    (newTree.ownerDocument as RRDocument).mirror;

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
          break;
        }
        case 'CANVAS':
          (newTree as RRCanvasElement).canvasMutations.forEach(
            (canvasMutation) =>
              replayer.applyCanvas(
                canvasMutation.event,
                canvasMutation.mutation,
                oldTree as HTMLCanvasElement,
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
            Array.from(oldChildren),
            newChildren,
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
    if (oldStartNode === undefined) {
      oldStartNode = oldChildren[++oldStartIndex];
    } else if (oldEndNode === undefined) {
      oldEndNode = oldChildren[--oldEndIndex];
    } else if (
      replayer.mirror.getId(oldStartNode) === rrnodeMirror.getId(newStartNode)
    ) {
      diff(oldStartNode, newStartNode, replayer, rrnodeMirror);
      oldStartNode = oldChildren[++oldStartIndex];
      newStartNode = newChildren[++newStartIndex];
    } else if (
      replayer.mirror.getId(oldEndNode) === rrnodeMirror.getId(newEndNode)
    ) {
      diff(oldEndNode, newEndNode, replayer, rrnodeMirror);
      oldEndNode = oldChildren[--oldEndIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (
      replayer.mirror.getId(oldStartNode) === rrnodeMirror.getId(newEndNode)
    ) {
      parentNode.insertBefore(oldStartNode, oldEndNode.nextSibling);
      diff(oldStartNode, newEndNode, replayer, rrnodeMirror);
      oldStartNode = oldChildren[++oldStartIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (
      replayer.mirror.getId(oldEndNode) === rrnodeMirror.getId(newStartNode)
    ) {
      parentNode.insertBefore(oldEndNode, oldStartNode);
      diff(oldEndNode, newStartNode, replayer, rrnodeMirror);
      oldEndNode = oldChildren[--oldEndIndex];
      newStartNode = newChildren[++newStartIndex];
    } else {
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
        const nodeToMove = oldChildren[indexInOld]!;
        parentNode.insertBefore(nodeToMove, oldStartNode);
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
        parentNode.insertBefore(newNode, oldStartNode || null);
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
      parentNode.insertBefore(newNode, referenceNode);
      diff(newNode, newChildren[newStartIndex], replayer, rrnodeMirror);
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

export function createOrGetNode(
  rrNode: IRRNode,
  domMirror: NodeMirror,
  rrnodeMirror: Mirror,
): Node {
  let node = domMirror.getNode(rrnodeMirror.getId(rrNode));
  const sn = rrnodeMirror.getMeta(rrNode);
  if (node !== null) return node;
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
        node = document.createElementNS(
          NAMESPACES['svg'],
          (rrNode as IRRElement).tagName.toLowerCase(),
        );
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

export function getNestedRule(
  rules: CSSRuleList,
  position: number[],
): CSSGroupingRule {
  const rule = rules[position[0]] as CSSGroupingRule;
  if (position.length === 1) {
    return rule;
  } else {
    return getNestedRule(
      (rule.cssRules[position[1]] as CSSGroupingRule).cssRules,
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
