import { elementNode, INode, NodeType } from 'rrweb-snapshot';
import type { inputData, Mirror, scrollData } from 'rrweb/src/types';
import {
  RRCDATASection,
  RRComment,
  RRElement,
  RRStyleElement,
  RRNode,
  RRText,
  VirtualStyleRules,
  StyleRuleType,
  RRDocument,
  RRIFrameElement,
  RRDocumentType,
} from './document-browser';

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
  applyInput: (data: inputData) => void;
  applyScroll: (data: scrollData, isSync: boolean) => void;
};

export function diff(
  oldTree: INode,
  newTree: RRNode,
  replayer: ReplayerHandler,
) {
  let inputDataToApply = null,
    scrollDataToApply = null;
  switch (newTree.nodeType) {
    case NodeType.Document:
      const newRRDocument = newTree as RRDocument;
      scrollDataToApply = newRRDocument.scrollData;
      break;
    case NodeType.Element:
      const oldElement = (oldTree as Node) as HTMLElement;
      const newRRElement = newTree as RRElement;
      diffProps(oldElement, newRRElement);
      scrollDataToApply = newRRElement.scrollData;
      inputDataToApply = newRRElement.inputData;
      if (newTree instanceof RRStyleElement && newTree.rules.length > 0) {
        applyVirtualStyleRulesToNode(
          oldElement as HTMLStyleElement,
          newTree.rules,
        );
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
    // TODO: Diff other kinds of nodes.
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
  if (newTree instanceof RRIFrameElement) {
    const oldContentDocument = (((oldTree as Node) as HTMLIFrameElement)
      .contentDocument as unknown) as INode;
    // If the iframe is cross-origin, the contentDocument will be null.
    if (oldContentDocument) {
      if (newTree.contentDocument.__sn) {
        oldContentDocument.__sn = newTree.contentDocument.__sn;
        replayer.mirror.map[
          newTree.contentDocument.__sn.id
        ] = oldContentDocument;
      }
      diff(oldContentDocument, newTree.contentDocument, replayer);
    }
  }

  scrollDataToApply && replayer.applyScroll(scrollDataToApply, true);
  /**
   * Input data need to get applied after all children of this node are updated.
   * Otherwise when we set a value for a select element whose options are empty, the value won't actually update.
   */
  inputDataToApply && replayer.applyInput(inputDataToApply);
}

function diffProps(oldTree: HTMLElement, newTree: RRElement) {
  const oldAttributes = oldTree.attributes;
  const newAttributes = newTree.attributes;

  for (const name in newAttributes) {
    const newValue = newAttributes[name];
    if ((newTree.__sn as elementNode).isSVG && NAMESPACES[name])
      oldTree.setAttributeNS(NAMESPACES[name], name, newValue);
    else oldTree.setAttribute(name, newValue);
  }

  for (const { name } of Array.from(oldAttributes))
    if (!(name in newAttributes)) oldTree.removeAttribute(name);
}

function diffChildren(
  oldChildren: (INode | undefined)[],
  newChildren: RRNode[],
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
          parentNode.__sn.type === NodeType.Document &&
          newNode.__sn.type === NodeType.Element &&
          newNode.__sn.tagName.toUpperCase() === 'HTML'
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

export function createOrGetNode(rrNode: RRNode, mirror: Mirror): INode {
  let node = mirror.getNode(rrNode.__sn.id);
  if (node !== null) return node;
  if (rrNode instanceof RRElement) {
    let tagName = rrNode.tagName.toLowerCase();
    tagName = SVGTagMap[tagName] || tagName;
    if ((rrNode.__sn as elementNode).isSVG) {
      node = (document.createElementNS(
        NAMESPACES['svg'],
        rrNode.tagName.toLowerCase(),
      ) as unknown) as INode;
    } else node = (document.createElement(rrNode.tagName) as unknown) as INode;
  } else if (rrNode instanceof RRDocumentType) {
    node = (document.implementation.createDocumentType(
      rrNode.name,
      rrNode.publicId,
      rrNode.systemId,
    ) as unknown) as INode;
  } else if (rrNode instanceof RRText) {
    node = (document.createTextNode(rrNode.textContent) as unknown) as INode;
  } else if (rrNode instanceof RRComment) {
    node = (document.createComment(rrNode.data) as unknown) as INode;
  } else if (rrNode instanceof RRCDATASection) {
    node = (document.createCDATASection(rrNode.data) as unknown) as INode;
  } else throw new Error('Unknown rrNode type ' + rrNode.toString());
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
