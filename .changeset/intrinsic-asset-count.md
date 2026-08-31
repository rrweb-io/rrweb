---
"rrweb": minor
"@rrweb/record": minor
"@rrweb/types": minor
---

Introduce a `intrinsicAssetCount` number on the FullSnapshot to record the number of 'intrinsic' assets that are due to arrive. All of these will arrive backdated with the same timestamp as the FullSnapshot so a server can reason about whether the FullSnapshot is 'complete'. Intrinsic assets are inline stylesheets, data: attributes (when they are recorded as an asset) and currently <link rel="stylesheet"> content (on the basis that browsers delay rendering to download css when encountering a <link> in the html header)
