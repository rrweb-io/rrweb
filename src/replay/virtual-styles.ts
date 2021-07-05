import { INode } from 'rrweb-snapshot';

export type VirtualStyleRules = [CSSRule | false, number][];
export type VirtualStyleRulesMap = Map<INode, VirtualStyleRules>;

export function applyVirtualStyleRulesToNode(
  storedRules: VirtualStyleRules,
  styleNode: HTMLStyleElement,
) {
  storedRules.forEach(([rule, index]) => {
    // Ensure consistency of cssRules list
    // if (styleNode?.sheet?.cssRules[index]) {
    // styleNode.sheet?.deleteRule(index);
    // }
    if (rule) {
      styleNode.sheet?.insertRule(rule.cssText, index);
    } else {
      styleNode.sheet?.deleteRule(index);
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
