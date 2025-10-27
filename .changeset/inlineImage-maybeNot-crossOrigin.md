---
"@junify-app/rrweb": patch
"@junify-app/rrweb-snapshot": patch
---

inlineImages: during snapshot avoid adding an event listener for inlining of same-origin images (async listener mutates the snapshot which can be problematic)
