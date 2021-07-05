import { INode } from 'rrweb-snapshot';

type Rule = string | false;
type Index = number | undefined;
export type VirtualStyleRules = [Rule, Index][];
export type VirtualStyleRulesMap = Map<INode, VirtualStyleRules>;

export function applyVirtualStyleRulesToNode(
  storedRules: VirtualStyleRules,
  styleNode: HTMLStyleElement,
) {
  storedRules.forEach(([rule, index]) => {
    if (rule) {
      styleNode.sheet?.insertRule(rule, index);
    } else {
      if (index !== undefined) styleNode.sheet?.deleteRule(index);
    }
  });
  // Avoid situation, when your Node has more styles, than it should
  // Otherwise, inserting will be broken
  if (styleNode.sheet && styleNode.sheet.cssRules.length > storedRules.length) {
    for (
      let i = styleNode.sheet.cssRules.length - 1;
      i < storedRules.length - 1;
      i--
    ) {
      styleNode.sheet.removeRule(i);
    }
  }
}
