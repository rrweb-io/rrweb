---
"rrweb-snapshot": patch
---

Add a `hackCssPseudoClasses` option to `rebuild` so snapshots can mirror `:active`, `:focus`, `:focus-visible` and `:focus-within` (in addition to `:hover`) as escaped classes for replay. Defaults to `[':hover']`, so existing behavior is unchanged.
