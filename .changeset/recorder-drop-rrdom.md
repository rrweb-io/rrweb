---
"rrweb": patch
"@rrweb/record": patch
---

Stop bundling rrdom into the recorder by duck-typing RRNodes in `hasShadowRoot` instead of using `instanceof BaseRRNode`. Shrinks the recorder by about 1 KB minified.
