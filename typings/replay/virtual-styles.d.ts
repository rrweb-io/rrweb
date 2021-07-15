import { INode } from 'rrweb-snapshot';
export declare enum StyleRuleType {
    Insert = 0,
    Remove = 1,
    Snapshot = 2
}
declare type InsertRule = {
    cssText: string;
    type: StyleRuleType.Insert;
    index?: number;
};
declare type RemoveRule = {
    type: StyleRuleType.Remove;
    index: number;
};
declare type SnapshotRule = {
    type: StyleRuleType.Snapshot;
    cssTexts: string[];
};
export declare type VirtualStyleRules = Array<InsertRule | RemoveRule | SnapshotRule>;
export declare type VirtualStyleRulesMap = Map<INode, VirtualStyleRules>;
export declare function applyVirtualStyleRulesToNode(storedRules: VirtualStyleRules, styleNode: HTMLStyleElement): void;
export declare function storeCSSRules(parentElement: HTMLStyleElement, virtualStyleRulesMap: VirtualStyleRulesMap): void;
export {};
