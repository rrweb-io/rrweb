---
'rrweb-snapshot': patch
---

Fix inline stylesheet capture on WebKit by reading CSS rules from `HTMLLinkElement.sheet` before falling back to `document.styleSheets`.
