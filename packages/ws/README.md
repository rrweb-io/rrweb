# @rrweb/ws

WebSocket transport for recording rrweb sessions to an rrweb ingest API.

## Installation

```bash
npm install @rrweb/ws
```

## Usage

### Bundler

```js
import rrwebWs, { start, stop, addMeta } from '@rrweb/ws';

start({
  serverUrl: 'https://api.rrweb.com/recordings/{recordingId}/ingest/ws',
  publicApiKey: 'ak_...',
  autostart: true,
  includePii: false,
  meta: {
    accountId: 'acct_123',
  },
});

addMeta({ plan: 'pro' });
rrwebWs.stop(false);
```

### Script Tag

```html
<script
  src="https://cdn.jsdelivr.net/npm/@rrweb/ws@latest/dist/ws.umd.cjs"
  autostart
>
  {
    "serverUrl": "https://api.rrweb.com/recordings/{recordingId}/ingest/ws",
    "publicApiKey": "ak_...",
    "includePii": false,
    "meta": {
      "accountId": "acct_123"
    }
  }
</script>
<script>
  rrwebWs.addMeta({ plan: 'pro' });
</script>
```

The UMD global is `rrwebWs`.

## Options

- `serverUrl`: ingest endpoint. Include `{recordingId}` in the URL, or the client will add it as a query parameter.
- `publicApiKey`: API key sent with WebSocket and HTTP fallback requests.
- `autostart`: starts recording when loaded from a script tag or when passed to the default config.
- `includePii`: includes additional visitor metadata such as language, timezone, and browser-visible title/referrer details.
- `meta`: custom recording metadata sent before recorded events.
- rrweb record options: other options are passed through to `record()` from rrweb, such as masking, blocking, sampling, and DOM capture options.

`inlineStylesheet` is currently used for stylesheet capture compatibility. Once the `captureAssets` recording API lands from the assets branch, `captureAssets.stylesheets` should replace that compatibility path.

## Local Dev/Test Env Vars

Copy `.env.example` to `.env` in this package when running local integration tests.

```bash
VITE_RRWEB_WS_SERVER_URL=http://localhost:8787/recordings/{recordingId}/ingest/ws
VITE_RRWEB_WS_API_BASE_URL=http://localhost:8787
VITE_TEST_API_KEY=ak_XXXX
```
