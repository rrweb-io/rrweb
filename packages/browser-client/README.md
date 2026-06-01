# @rrweb/browser-client

Browser client for recording rrweb sessions to an rrweb Cloud-compatible API. It wraps rrweb recording, streams events over WebSocket, and falls back to HTTP POST for buffered events.

This README covers the npm/ESM package. For the hosted script snippet and broader rrweb Cloud setup, see the [JavaScript SDK guide](https://rrweb.com/docs/cloud/javascript-sdk).

## Installation

```bash
npm install @rrweb/browser-client
```

## Quick Start

```js
import rrwebBrowserClient, {
  start,
  stop,
  addMeta,
  getRecordingId,
} from '@rrweb/browser-client';

start({
  publicApiKey: 'public_key_rr_...',
  includePii: false,
  meta: {
    userId: 'user-123',
    environment: 'production',
  },
});

addMeta({ plan: 'pro' });

console.log('recording id', getRecordingId());
stop(false);
```

The default export exposes the same methods:

```js
rrwebBrowserClient.start({
  publicApiKey: 'public_key_rr_...',
});
```

## Options

- `serverUrl`: optional events endpoint. Defaults to `https://api.rrweb.com/recordings/{recordingId}/events/ws`. Include `{recordingId}` in custom URLs, or the client will add it as a query parameter. `http` and `https` URLs are converted to `ws` and `wss` for the WebSocket connection, and the HTTP fallback posts to the same endpoint without a trailing `/ws`. See [Recording endpoint proxying](https://rrweb.com/docs/cloud/ingest-proxying) when routing events through your own domain.
- `publicApiKey`: public write-only API key sent with WebSocket and HTTP fallback requests. rrweb Cloud public keys use the `public_key_rr_...` format. See [API Keys](https://rrweb.com/docs/cloud/api-keys).
- `includePii`: default `false`. When enabled, the client includes additional visitor metadata such as language, timezone, screen size, title, and referrer details. See [Pre-baked metadata](https://rrweb.com/docs/cloud/prebaked-meta).
- `meta`: custom recording metadata sent before recorded events. Built-in diagnostics such as `recordVersion`, `recordCommitHash`, `jsSource`, and `jsEntrypoint` are added automatically after custom metadata. See [Application Metadata](https://rrweb.com/docs/cloud/application-meta).
- `jsSource`: optional source identifier for programmatic loaders. URL values are recorded without query strings or hashes.
- `jsEntrypoint`: optional entrypoint label. Defaults to `programmatic` for direct `start()` calls and `script-tag` for script-tag autostart.
- `captureAssets`: optional rrweb asset capture configuration. Stylesheet capture defaults to `captureAssets.stylesheets: 'without-fetch'`, so replay can include the CSS needed for the recorded page without fetching stylesheets during recording. Pass your own `captureAssets` object to customize supported rrweb asset capture options.
- rrweb record options: other options are passed through to `record()` from rrweb, such as masking, blocking, sampling, and DOM capture options. See the [rrweb recording docs](https://rrweb.com/docs/packages/record/readme).

### Stylesheet Capture

The browser client enables stylesheet capture by default through `captureAssets.stylesheets`. This records linked stylesheet assets for replay without requiring each caller to configure asset capture manually.

`inlineStylesheet` remains available as a legacy rrweb compatibility option, but new ESM/npm integrations should prefer `captureAssets`.

## Recording Helpers

- `getRecordingId()`: returns the current recording id, creating it before `start()` if needed. Recording ids are stored in `sessionStorage`, so separate tabs get separate recording contexts.
- `addMeta(payload)`: adds or updates recording metadata after recording has started.
- `addPageviewMeta(payload)`: adds metadata for the current page view.
- `addCustomEvent(tag, payload)`: queues a custom rrweb event.
- `stop(resetRecordingId)`: stops rrweb recording and closes the WebSocket. Pass `true` to clear the stored recording id before a future `start()`.

## Further Reading

- [JavaScript SDK guide](https://rrweb.com/docs/cloud/javascript-sdk)
- [WebSocket event streaming](https://rrweb.com/docs/cloud/websocket-ingest)
- [Application Metadata](https://rrweb.com/docs/cloud/application-meta)
- [Replaying Guide](https://rrweb.com/docs/cloud/replaying-guide)

## Local Dev/Test Env Vars

Copy `.env.example` to `.env` in this package when running local integration tests.

```bash
VITE_RRWEB_BROWSER_CLIENT_SERVER_URL=http://localhost:8787/recordings/{recordingId}/events/ws
VITE_RRWEB_BROWSER_CLIENT_API_BASE_URL=http://localhost:8787
VITE_TEST_PUBLIC_API_KEY=public_key_rr_XXXX
VITE_TEST_READ_API_KEY=ak_XXXX

# Backward-compatible fallback for tests that still read VITE_TEST_API_KEY.
VITE_TEST_API_KEY=public_key_rr_XXXX
```
