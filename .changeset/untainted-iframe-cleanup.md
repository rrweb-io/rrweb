---
"rrweb": patch
"@rrweb/utils": patch
---

Remove the temporary iframe used by `getUntaintedPrototype` when it bails out early or throws, so it no longer leaks into the page
