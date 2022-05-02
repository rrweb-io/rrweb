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
