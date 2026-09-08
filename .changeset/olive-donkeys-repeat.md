---
"rrweb-snapshot": patch
---

Fix `<style>` rules being dropped on replay when a mutation inserts a text node between two `_cssText` splits. The split points recorded by `markCssSplits` regularly land in the middle of a rule, which produces invalid css once a sibling is inserted between the parts; `applyCssSplits` now moves each split point forward to the end of the rule it lands in.
