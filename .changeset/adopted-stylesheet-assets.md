---
"rrweb": minor
"@rrweb/record": minor
"@rrweb/replay": minor
"@rrweb/types": patch
---

Add `captureAssets.adoptedStylesheetAssets` option (default `false`). When enabled, the css content of adopted (constructed) stylesheets is emitted as a separate `asset` event and referenced from the adopted stylesheet event by `assetUrls` virtual urls (the stylesheet's id is embedded in each url), rather than being inlined as css rules. This de-duplicates css that is shared across many adopted stylesheets and keeps the incremental snapshot events small. Capture of a newly-adopted stylesheet is deferred briefly until its rule count is stable, so a sheet that is adopted empty and populated immediately after is captured as a single complete asset rather than an empty asset plus follow-up rule mutations. Replay reconstructs the stylesheets from the asset.
