# @rrweb/browser-client

## Overview

Browser client for recording rrweb sessions to an rrweb Cloud-compatible API. It wraps rrweb recording, streams events over WebSocket, and falls back to HTTP POST for buffered events.

This README covers the npm/ESM package. For the hosted script snippet and broader rrweb Cloud setup, see the [Browser Client guide](https://rrweb.com/docs/cloud/browser-client).

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
  addAnnotation,
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
addAnnotation({ type: 'timelineMarker', text: 'Checkout started' });

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
- rrweb record options: other options are passed through to `record()` from rrweb, such as masking, blocking, sampling, and DOM capture options. See the [rrweb recording docs](https://rrweb.com/docs/packages/record/readme).

### Stylesheet Capture

`inlineStylesheet` is currently used for stylesheet capture compatibility. Once the `captureAssets` recording API lands from the assets branch, `captureAssets.stylesheets` should replace that compatibility path.

## Recording Helpers

- `getRecordingId()`: returns the current recording id, creating it before `start()` if needed. Recording ids are stored in `sessionStorage`, so separate tabs get separate recording contexts.
- `addMeta(payload)`: adds or updates recording metadata after recording has started.
- `addPageviewMeta(payload)`: adds metadata for the current page view.
- `addCustomEvent(tag, payload)`: records a custom rrweb event.
- `addAnnotation(annotation)`: records a caption or timeline marker annotation.
- `stop(resetRecordingId)`: stops rrweb recording and closes the WebSocket. Pass `true` to clear the stored recording id before a future `start()`.

Both `addCustomEvent()` and `addAnnotation()` queue events until the recorder is ready,
including calls made before `start()` or while the document is still loading.
When recording starts, queued events pass through the configured `emit` callback
and are sent to the server with their original call-time timestamps. Events added
during active recording use the same callback and delivery path. Calling `stop()`
discards events still waiting for the recorder to start.

## Further Reading

- [Browser Client guide](https://rrweb.com/docs/cloud/browser-client)
- [WebSocket event streaming](https://rrweb.com/docs/cloud/websocket-ingest)
- [Application Metadata](https://rrweb.com/docs/cloud/application-meta)
- [Replaying Guide](https://rrweb.com/docs/cloud/replaying-guide)

## Local Dev/Test Env Vars

Copy `.env.example` to `.env` in this package when running local integration tests.

```bash
VITE_RRWEB_BROWSER_CLIENT_SERVER_URL=http://localhost:8787/recordings/{recordingId}/events/ws
VITE_RRWEB_BROWSER_CLIENT_API_BASE_URL=http://localhost:8787
VITE_TEST_API_KEY=public_key_rr_XXXX
```

## Upload Failure Policy

HTTP fallback is serialized across periodic, page-hidden, oversized-event and
stop/freeze flushes. Queued events stay ordered behind any unresolved HTTP batch,
including after a WebSocket reconnect; direct WebSocket delivery resumes once
that backlog is accepted. A successful batch is removed before the next batch.

Network failures, timeouts, HTTP 408/429 and 5xx responses allow at most four
attempts for a failing batch, with 5/10/20-second backoff. Each request times out
and is aborted after 15 seconds. Valid `Retry-After` values extend the delay up to
60 seconds; a longer requested delay ends delivery instead of retrying early or
retaining data indefinitely. Other non-success HTTP responses end delivery.

The queue and active HTTP batch share a 5 MiB serialized UTF-8 budget, and the
queue accepts at most 10,000 events. HTTP batches include newline bytes in their
64,000-byte keepalive limit. A single larger event uses ordinary fetch within
the same queue budget. WebSocket sends also check the browser's buffered amount
against a separate 5 MiB budget. These are payload budgets, not exact JavaScript
heap limits. Transient serialization and request-body copies use additional
memory.

Exhausted retries, terminal responses, or exceeded queue limits discard buffered
events, stop transport retries and warn once without logging event contents.
Delivery remains disabled until an explicit new `start()`; freeze/resume retains
that failure state and retry budget. This avoids sending dependent mutations
after silently dropping their snapshots. Call `stop(true)` before restarting if
a new recording ID is needed after incomplete delivery.

Freeze suspends polling while retaining bounded state for resume. Stop removes
lifecycle listeners and allows an existing request or final flush to settle,
without scheduling retries. A later start waits for that flush before sending. Stopping that later recording
while an earlier flush is still pending discards its unsent queue rather than
retaining a chain of stopped recordings.
Page lifecycle delivery remains best effort: browsers may suspend or terminate
the page before a request completes, especially above the keepalive limit.

There is no client idempotency key or verified server deduplication guarantee.
A rejected or timed-out request may already have been accepted by the server;
retrying it can duplicate events. This policy does not promise lossless or
exactly-once delivery.
