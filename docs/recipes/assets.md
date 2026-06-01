# Asset Capture

Asset capture records external resources as `Asset` events that are associated with the snapshot or mutation where rrweb found the resource. During replay, rrweb applies those assets when rebuilding the matching snapshot, so images, media, and stylesheets can be replayed even when the original URL is unavailable or has changed.

Use `captureAssets` with `record`:

```js
import { record } from '@rrweb/record';

record({
  emit(event) {},
  captureAssets: {
    objectURLs: true,
    origins: ['https://static.example.com'],
    images: true,
    video: false,
    audio: false,
    stylesheets: 'without-fetch',
    processStylesheetsWithin: 2000,
    stylesheetsRuleThreshold: 0,
  },
});
```

## Asset events

Assets are emitted after the `FullSnapshot` or `IncrementalSnapshot` that detected them. Their event timestamp can be later than the related snapshot, but replay still uses the asset with the snapshot it belongs to.

For stylesheets, rrweb can process CSS rules asynchronously and emit them as asset events. This keeps expensive stylesheet serialization out of the initial snapshot path while still letting replay apply the captured stylesheet before visual replay when the asset is available.

## Options

`captureAssets` is an object with these fields:

- `objectURLs` (default: `true`): capture same-origin `blob:` assets created with `URL.createObjectURL()`.
- `origins` (default: `false`): choose which URL origins rrweb captures. Use `false` or `[]` to disable origin-based capture, `true` to capture from any origin, or an array such as `['https://static.example.com']` to allow specific origins.
- `images`: capture images even when their origin does not match `origins`. If unset, images are captured only when `origins` matches. `inlineImages: true` maps to `captureAssets.images: true`.
- `video`: capture video assets even when their origin does not match `origins`. If unset, videos are captured only when `origins` matches.
- `audio`: capture audio assets even when their origin does not match `origins`. If unset, audio files are captured only when `origins` matches.
- `stylesheets`: controls stylesheet asset capture. Use `false` to disable it, `'without-fetch'` to capture stylesheets whose CSS rules are already browser-accessible, or `true` to also fetch stylesheet URLs when needed. When stylesheet capture is enabled, including `'without-fetch'`, configured `origins` can allow fetch capture for matching stylesheet URLs.
- `processStylesheetsWithin` (default: `2000`): maximum delay, in milliseconds, for asynchronous stylesheet processing. Lower values reduce the chance that short visits unload before stylesheet assets are emitted. Set `0` or a negative value to process synchronously, which can block the main thread.
- `stylesheetsRuleThreshold` (default: `0`): stylesheets with fewer rules than this threshold are processed immediately and included in the snapshot instead of emitted as separate assets.

## Legacy inline options

`inlineImages` and `inlineStylesheet` are still accepted for compatibility, but new integrations should use `captureAssets`.

- `inlineImages: true` maps to `captureAssets.images: true` when `captureAssets.images` is not set.
- `inlineStylesheet: 'all'` maps to `captureAssets.stylesheets: true`.
- `inlineStylesheet: true` maps to `captureAssets.stylesheets: 'without-fetch'`.
- `inlineStylesheet: false` maps to `captureAssets.stylesheets: false`.

When calling `rrweb-snapshot` directly, the historical inline behavior is preserved. The mapping above applies to `record`.
