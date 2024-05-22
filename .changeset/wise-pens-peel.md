---
"rrweb-snapshot": major
"rrweb": major
---

`inlineImages` recording option has been deprecated and is now an alias for `captureAssets: { objectURLs: true, origins: true }`.
Please see [asset recording documentation](/docs/recipes/assets.md) for more information.

The reason we deprecated `inlineImages` is because it modified events after they where already emitted, which could lead to events being saved without the corresponding images. The new `captureAssets` option records assets as a separate event, ensuring that all assets are recorded and events are not modified after they are emitted.
