# Asset Capture Methods & Configuration in rrweb

[rrweb](https://rrweb.io/) is a JavaScript library that allows you to record and replay user interactions on your website. It provides various configuration options for capturing assets (such as images) during the recording process. In this document, we will explore the different asset capture methods and their configuration options in rrweb.

## Asset Events

Assets are a new type of event that embody a serialized version of a http resource captured during snapshotting. Some examples are images, media files and stylesheets. Resources can be fetched externally (from cache) in the case of a href, or internally for blob: urls and same-origin stylesheets. Asset events are emitted subsequent to either a FullSnapshot or an IncrementalSnapshot (mutation), and although they may have a later timestamp, during replay they are rebuilt as part of the snapshot that they are associated with. In the case where e.g. a stylesheet is referenced at the time of a FullSnapshot, but hasn't been downloaded yet, there can be a subsequent mutation event with a later timestamp which, along with the asset event, can recreate the experience of a network-delayed load of the stylesheet.

## Assets to mitigate stylesheet processing cost

In the case of stylesheets, rrweb does some record-time processing in order to serialize the css rules which had a negative effect on the initial page loading times and how quickly the FullSnapshot was taken (see https://pagespeed.web.dev/). These are now taken out of the main thread and processed asynchronously to be emitted (up to `processStylesheetsWithin` ms) later. There is no corresponding delay on the replay side so long as the stylesheet has been successfully emitted.

## Asset Capture Configuration

The `captureAssets` configuration option allows you to customize the asset capture process. It is an object with the following properties:

- `objectURLs` (default: `true`): This property specifies whether to capture same-origin `blob:` assets using object URLs. Object URLs are created using the `URL.createObjectURL()` method. Setting `objectURLs` to `true` enables the capture of object URLs.

- `origins` (default: `false`): This property determines which origins to capture assets from. It can have the following values:

  - `false` or `[]`: Disables capturing any assets apart from object URLs, stylesheets (unless set to false) and images (if that setting is turned on).
  - `true`: Captures assets from all origins.
  - `[origin1, origin2, ...]`: Captures assets only from the specified origins. For example, `origins: ['https://s3.example.com/']` captures all assets from the origin `https://s3.example.com/`.

- `images` (default: `true` if `inlineImages` is true in rrweb.record config): When set to true, this option turns on asset capturing for all images irrespective of their origin. When set to false, no images will be captured even if the origin matches. By default images will be captured if their src url matches the `origins` setting above, including if the `origins` is set to `true`.

- `video` When set to true, this option turns on asset capturing for videos irrespective of their origin. When set to false, no videos will be captured even if the origin matches. By default videos will be captured if their src url matches the `origins` setting above, including if the `origins` is set to `true`.

- `audio` When set to true, this option turns on asset capturing for audio files irrespective of their origin. When set to false, no audio files will be captured even if the origin matches. By default audio files will be captured if their src url matches the `origins` setting above, including if the `origins` is set to `true`.

- `stylesheets` (default: `'without-fetch'`): When set to `true`, this turns on capturing of all stylesheets and style elements via the asset system irrespective of origin. The default of `'without-fetch'` is designed to match with the previous `inlineStylesheet` behaviour, whereas the `true` value allows capturing of stylesheets which are otherwise inaccessible due to CORS restrictions to be captured via a fetch call, which will normally use the browser cache. If a stylesheet matches via the `origins` config above, it will be captured irrespective of this config setting (either directly or via fetch).

- `stylesheetsRuleThreshold` (default: `0`): only invoke the asset system for stylesheets with more than this number of rules. Defaults to zero (rather than say 100) as it only looks at the 'outer' rules (e.g. could have a single media rule which nests 1000s of sub rules). This default may be increased based on feedback.

- `processStylesheetsWithin` (default: `2000`): This property defines the maximum time in milliseconds that the browser should delay before processing stylesheets. Inline `<style>` elements will be processed within half this value. Lower this value if you wish to improve the odds that short 'bounce' visits will emit the asset before visitor unloads page. Set to zero or a negative number to process stylesheets synchronously, which can cause poor scores on e.g. https://pagespeed.web.dev/ ("Third-party code blocked the main thread"), and also cause assets to be emitted with an earlier timestamp than the snapshot they are associated with.

## TypeScript Type Definition

Here is the TypeScript type definition for the `recordOptions` object, which includes the asset capture configuration options:

```typescript
export type recordOptions<T> = {
  // Other configuration options...
  captureAssets?: {
    objectURLs: boolean;
    origins: string[] | true | false;
    images: boolean;
    stylesheets: boolean | 'without-fetch';
    processStylesheetsWithin: number;
    stylesheetsRuleThreshold: number;
  };
  inlineImages?: boolean;
  inlineStylesheet?: boolean;
  // Other configuration options...
};
```

This type definition shows that `captureAssets` is an optional property of the `recordOptions` object. It contains the `objectURLs` and `origins` properties, which have the same meanings as described above.

## Inline Images

When set in rrweb.record, the previous `inlineImages` configuration option has been changed so that images are now captured using the asset system instead of being inlined into the snapshot. The previous implementation had a problem in that the snapshot was modified asynchronously after images were loaded/processed. hadn't loaded yet, and the snapshot may have already been emitted. When using rrwebSnapshot.snapshot directly, the previous inlining behaviour is still preserved.

## Inline Stylesheets

In rrweb.record the `inlineStylesheet` configuration option has been updated to use the asset system. When it is `true` (the default), stylesheets whose rules are accessible from a CORS point of view are captured as an asset instead of being inlined. There is also now an `inlineStylesheet: 'all'` option which is equivalent to `captureAssets.stylesheets: true`. When using rrwebSnapshot.snapshot directly, the previous inlining behaviour is still preserved.

## Conclusion

By configuring the `captureAssets` option in rrweb, you can control how assets like images are captured during the recording process. This allows you to customize which assets are included in the recorded interactions on your website.
