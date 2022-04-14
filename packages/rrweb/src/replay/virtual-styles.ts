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
type SnapshotRule = {
  type: StyleRuleType.Snapshot;
  cssTexts: string[];
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
  InsertRule | RemoveRule | SnapshotRule | SetPropertyRule | RemovePropertyRule
>;
export type VirtualStyleRulesMap = Map<Node, VirtualStyleRules>;

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
  storedRules: VirtualStyleRules,
  styleNode: HTMLStyleElement,
) {
  const { sheet } = styleNode;
  if (!sheet) {
    // styleNode without sheet means the DOM has been removed
    // so the rules no longer need to be applied
    return;
  }

  storedRules.forEach((rule) => {
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
    } else if (rule.type === StyleRuleType.Snapshot) {
      restoreSnapshotOfStyleRulesToNode(rule.cssTexts, styleNode);
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
    virtualStyleRulesMap.set(parentElement, [
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
