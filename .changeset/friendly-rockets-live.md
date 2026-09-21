---
"rrweb": patch
"@rrweb/record": patch
"@rrweb/types": patch
---

Implement configurable throttling on mutation emission using a new `sampling.mutation` setting which affects the attribute and text mutations on a per element basis (so a change to a well behaved element isn't delayed by another noisier one)
