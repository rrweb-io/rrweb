import { INode } from 'rrweb-snapshot';

export enum StyleRuleType {
  Insert,
  Remove,
  Snapshot,
}

type InsertRule = {
  cssText: string;
  type: StyleRuleType.Insert;
  index?: number;
};
type RemoveRule = {
  type: StyleRuleType.Remove;
  index: number;
};
type SnapshotRule = {
  type: StyleRuleType.Snapshot;
  cssTexts: string[];
};

export type VirtualStyleRules = Array<InsertRule | RemoveRule | SnapshotRule>;
export type VirtualStyleRulesMap = Map<INode, VirtualStyleRules>;

export function applyVirtualStyleRulesToNode(
  storedRules: VirtualStyleRules,
  styleNode: HTMLStyleElement,
) {
  storedRules.forEach((rule) => {
    if (rule.type === StyleRuleType.Insert) {
      try {
        styleNode.sheet?.insertRule(rule.cssText, rule.index);
      } catch (e) {
        /**
         * sometimes we may capture rules with browser prefix
         * insert rule with prefixs in other browsers may cause Error
         */
      }
    } else if (rule.type === StyleRuleType.Remove) {
      try {
        styleNode.sheet?.deleteRule(rule.index);
      } catch (e) {
        /**
         * accessing styleSheet rules may cause SecurityError
         * for specific access control settings
         */
      }
    } else if (rule.type === StyleRuleType.Snapshot) {
      restoreSnapshotOfStyleRulesToNode(rule.cssTexts, styleNode);
    }
  });
}

function restoreSnapshotOfStyleRulesToNode(
  cssTexts: string[],
  styleNode: HTMLStyleElement,
) {
  try {
    const existingRules = Array.from(styleNode.sheet?.cssRules || []).map(
      (rule) => rule.cssText,
    );
    const existingRulesReversed = Object.entries(existingRules).reverse();
    let lastMatch = existingRules.length;
    existingRulesReversed.forEach(([index, rule]) => {
      const indexOf = cssTexts.indexOf(rule);
      if (indexOf === -1 || indexOf > lastMatch) {
        try {
          styleNode.sheet?.deleteRule(Number(index));
        } catch (e) {
          /**
           * accessing styleSheet rules may cause SecurityError
           * for specific access control settings
           */
        }
      }
      lastMatch = indexOf;
    });
    cssTexts.forEach((cssText, index) => {
      try {
        if (styleNode.sheet?.cssRules[index]?.cssText !== cssText) {
          styleNode.sheet?.insertRule(cssText, index);
        }
      } catch (e) {
        /**
         * sometimes we may capture rules with browser prefix
         * insert rule with prefixs in other browsers may cause Error
         */
      }
    });
  } catch (e) {
    /**
     * accessing styleSheet rules may cause SecurityError
     * for specific access control settings
     */
  }
}

export function storeCSSRules(
  parentElement: HTMLStyleElement,
  virtualStyleRulesMap: VirtualStyleRulesMap,
) {
  try {
    const cssTexts = Array.from(
      (parentElement as HTMLStyleElement).sheet?.cssRules || [],
    ).map((rule) => rule.cssText);
    virtualStyleRulesMap.set((parentElement as unknown) as INode, [
      {
        type: StyleRuleType.Snapshot,
        cssTexts,
      },
    ]);
  } catch (e) {
    /**
     * accessing styleSheet rules may cause SecurityError
     * for specific access control settings
     */
  }
}
