---
"rrweb": patch
---

fix style attribute diffing under a strict CSP (`style-src-attr 'none'`): the previous style value is now parsed via CSSOM instead of `setAttribute('style')`, which was blocked by the CSP, caused a violation report for every inline style mutation and meant removed style properties were not recorded
