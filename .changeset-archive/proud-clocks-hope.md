---
"rrweb-snapshot": patch
---

(when `recordCanvas: true`): ensure we use doc.createElement instead of document.createElement to allow use in non-browser e.g. jsdom environments
