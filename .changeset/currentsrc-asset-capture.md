---
"rrweb-snapshot": patch
"rrweb": minor
"rrdom": patch
"@rrweb/record": minor
"@rrweb/replay": minor
"@rrweb/types": minor
---

Capture responsive image assets by the browser-selected source (`currentSrc`) and add a `captureAssets.sources` option. The default `'current'` records the single displayed image (pinned as a definite `src` at replay) and re-pins it via a mutation when the selection changes (e.g. viewport resize); `'all'` records every candidate and the replayer re-selects from the local assets. The original `srcset`/`src` are preserved as inert `rrweb-original-*` attributes for debugging.
