---
"rrweb-snapshot": minor
"rrweb": minor
"@rrweb/record": minor
"@rrweb/replay": minor
"@rrweb/types": minor
---

Introduce a single `maxAssetWithin` millisecond number on a FullSnapshot to record a single figure for expected delay in capturing the intrinsic assets of a FullSnapshot. During replay we need to wait until these assets arrive in order to avoid a Flash Of Unstyled Content, and the `maxAssetWithin` figure is used to bound this delay.
