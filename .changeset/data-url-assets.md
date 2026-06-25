---
"rrweb-snapshot": minor
"rrweb": minor
"@rrweb/record": minor
"@rrweb/replay": minor
"@rrweb/types": minor
---

Capture `data:` urls as assets under a short, type-aware virtual url (`#rr_data_<kind>:N`, e.g. `#rr_data_image:1` or `#rr_data_style:2`) instead of leaving the (often large) data: url inline in the snapshot. Identical data: urls within a recording are de-duplicated to a single asset. A new `captureAssets.dataURLAssetThreshold` option (default 200 characters) keeps short data: urls inline, where a separate asset event would cost more than it saves; set it to 0 to emit every data: url as an asset.
