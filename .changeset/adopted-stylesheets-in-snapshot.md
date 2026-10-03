---
"rrweb-snapshot": patch
"@rrweb/types": patch
---

Capture and rebuild constructed stylesheets (`document.adoptedStyleSheets` and shadow root `adoptedStyleSheets`) in `rrweb-snapshot`'s `snapshot()`/`rebuild()`. Previously only the full `rrweb` record/replay pipeline supported adopted stylesheets; direct `rrweb-snapshot` consumers lost styles applied via constructed stylesheets, as used by many web component frameworks. Fixes #1567.
