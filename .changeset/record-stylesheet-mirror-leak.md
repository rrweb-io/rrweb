---
"rrweb": patch
"@rrweb/record": patch
"@rrweb/replay": patch
---

Fix a recorder memory leak in `StyleSheetMirror`. Its strong `id → CSSStyleSheet` map pinned every adopted (constructable) stylesheet for the whole recording session, even after the host left the DOM. That reverse lookup is only used by the replayer, so it now lives as a plain `Map` local to the replayer, and the record-side mirror keeps only the `CSSStyleSheet → id` `WeakMap`, which releases stylesheets automatically.
