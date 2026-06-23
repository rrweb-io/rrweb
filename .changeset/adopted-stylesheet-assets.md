---
"rrweb": minor
"@rrweb/record": minor
"@rrweb/replay": minor
"@rrweb/types": minor
---

Add `captureAssets.adoptedStylesheetAssets` option (default `false`) to recordOptions. When enabled, the css content of adopted (constructed) stylesheets is emitted as a separate asset event and referenced from the adopted stylesheet event by `assetUrls` virtual urls (the stylesheet's id is embedded in each url), rather than being inlined as css rules. Replay reconstructs the stylesheets from the asset.
