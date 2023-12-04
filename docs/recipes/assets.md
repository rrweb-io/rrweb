# Asset Capture Methods & Configuration in rrweb

[rrweb](https://rrweb.io/) is a JavaScript library that allows you to record and replay user interactions on your website. It provides various configuration options for capturing assets (such as images) during the recording process. In this document, we will explore the different asset capture methods and their configuration options in rrweb.

## Inline Images (Deprecated)

The `inlineImages` configuration option is deprecated and should not be used anymore. The previous implementation had some issues, namely rewriting events that are already emitted which might make you miss the inlined image if the event has already been sent to the server. Currently it just turns on `captureAssets`, so use please directly use the `captureAssets` option to configure asset capture.

## Asset Capture Configuration

The `captureAssets` configuration option allows you to customize the asset capture process. It is an object with the following properties:

- `objectURLs` (default: `true`): This property specifies whether to capture same-origin `blob:` assets using object URLs. Object URLs are created using the `URL.createObjectURL()` method. Setting `objectURLs` to `true` enables the capture of object URLs.

- `origins` (default: `false`): This property determines which origins to capture assets from. It can have the following values:
  - `false` or `[]`: Disables capturing any assets apart from object URLs.
  - `true`: Captures assets from all origins.
  - `[origin1, origin2, ...]`: Captures assets only from the specified origins. For example, `origins: ['https://s3.example.com/']` captures all assets from the origin `https://s3.example.com/`.

## TypeScript Type Definition

Here is the TypeScript type definition for the `recordOptions` object, which includes the asset capture configuration options:

```typescript
export type recordOptions<T> = {
  // Other configuration options...
  captureAssets?: {
    objectURLs: boolean;
    origins: string[] | true | false;
  };
  inlineImages?: boolean; // Deprecated, don't use it anymore
  // Other configuration options...
};
```

This type definition shows that `captureAssets` is an optional property of the `recordOptions` object. It contains the `objectURLs` and `origins` properties, which have the same meanings as described above.

## Conclusion

By configuring the `captureAssets` option in rrweb, you can control how assets like images are captured during the recording process. This allows you to customize which assets are included in the recorded interactions on your website.
