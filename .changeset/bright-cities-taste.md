---
"@rrweb/rrweb-plugin-console-record": patch
---

Fix wrapped console methods being called with the wrong `this`, which could throw "Illegal invocation" in strict contexts such as extension content scripts
