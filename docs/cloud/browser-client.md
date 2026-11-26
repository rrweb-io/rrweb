---
title: Browser Client
description: The rrweb Browser Client records events in the browser and streams them to rrweb Cloud over WebSocket with an HTTP fallback, installed from npm or loaded from the CDN.
---

<!--
Published at https://rrweb.com/docs/cloud/browser-client.
Preserve `<ApiKeyDisplay />`, `:::tabs`, `{#id}` anchors, and `/cloud/...` or `/operations/...` links.
-->
# Browser Client

<ApiKeyDisplay type="confirm" />

The rrweb browser client records rrweb events in the browser and sends them to rrweb Cloud. Use the npm package for application code that is built with a bundler.

Before enabling it on production pages, choose blocking, masking, sampling, and advanced capture behavior in [Recording and privacy settings](/cloud/recording-settings).

## Install with npm {#install-with-npm}

Install `@rrweb/browser-client` from npm and call `start()` with your public API key; it streams events over WebSocket to rrweb Cloud and falls back to HTTP POST when WebSocket is unavailable or the connection is interrupted, for example on page unload.

```bash
npm install @rrweb/browser-client
```

Start recording with your public API key:

```javascript
import { start } from '@rrweb/browser-client';

start({
  publicApiKey: 'your-public-api-key-here',
});
```

The standard rrweb Cloud connection [streams events over websockets](/operations/get-recordings-{recordingId}-events-ws) to `https://api.rrweb.com/`. The browser client also uses the [POST endpoint](/operations/post-recordings-{recordingId}-events) as a fallback when websockets are unavailable or when the websocket connection is interrupted, for example on page unload.

## Install from the CDN {#cdn-install}

Load the CDN module build when you cannot bundle npm packages or want a script-tag integration; a UMD build is also available for classic script-tag usage with `window.rrwebBrowserClient` and the `autostart` attribute.

Bundling from npm stays the recommended default for application code, because it keeps recording off a third-party `script-src` entry in your Content Security Policy.

```html
<script type="module">
  import { start } from 'https://cdn.rrweb.com/browser-client/current/browser-client.js';

  start({
    publicApiKey: 'your-public-api-key-here',
  });
</script>
```

If you need a classic global script tag, use the UMD build at `https://cdn.rrweb.com/browser-client/current/browser-client.umd.min.cjs`. The UMD build exposes `window.rrwebBrowserClient` and supports the `autostart` attribute.

## Customize the config {#customizing-config}

Pass a config object to `start()`, or in UMD script-tag usage with `autostart`, provide the same JSON config inside the `<script>` body.

See [Recording and privacy settings](/cloud/recording-settings) for the distinction between Browser Client-owned options and rrweb options forwarded to `record()`.

### Browser client options {#browser-client-options}

- `publicApiKey` (**required**): Your public API key for authentication. This key identifies your organization and is safe to use in browser-side code because it only has write permissions. Obtain it from your [rrweb Cloud dashboard](https://app.rrweb.com/api-keys).
- `serverUrl`: optional events endpoint. The default is `https://api.rrweb.com/recordings/{recordingId}/events/ws`. Include `{recordingId}` in the URL, or the client adds the recording ID as a query parameter. `http` and `https` URLs are converted to `ws` and `wss` for the websocket connection, and the HTTP fallback posts to the same endpoint without a trailing `/ws`. UMD script-tag installs can also infer this from the hosted script URL when it is omitted. See [Recording endpoint proxying](/cloud/ingest-proxying) when routing events through your own domain.
- `includePii` (default: `false`): whether to include optional visitor metadata that can be personally identifiable. See the [Optional visitor metadata](/cloud/prebaked-meta) guide.
- `autostart` (default: `false`): only relevant for script-tag usage. It controls whether the script calls `start()` as soon as the page is ready.
- `jsSource`: optional source identifier for programmatic loaders. URL values are recorded without query strings or hashes.
- `jsEntrypoint`: optional entrypoint label. Defaults to `programmatic` for direct `start()` calls and `script-tag` for script-tag autostart.

:::tabs key:codesample
== NPM

```javascript
import { start } from '@rrweb/browser-client';

start({
  // REQUIRED: your public API key
  publicApiKey: 'your-public-api-key-here',

  // Standard rrweb recording options can be mixed in.
  blockSelector: '.my-block-class',
  inlineImages: false,
  recordCanvas: false,
});
```

== CDN

```html
<script type="module">
  import { start } from 'https://cdn.rrweb.com/browser-client/current/browser-client.js';

  start({
    publicApiKey: 'your-public-api-key-here',
    blockSelector: '.my-block-class',
    inlineImages: false,
    recordCanvas: false,
  });
</script>
```

:::

### Attach application metadata {#application-metadata}

Provide a `meta` object in the starting config to associate key/value pairs with the recording so they can be retrieved later in a way that is meaningful in your application; use [`addMeta()`](#addmeta) if the data becomes available after recording starts.

See the [Application metadata](/cloud/application-meta) guide, which also shows how to associate metadata server-side without exposing it to the frontend.

:::tabs key:codesample
== NPM

```javascript
import { start } from '@rrweb/browser-client';

start({
  publicApiKey: 'your-public-api-key-here',
  meta: {
    user_id: 'user-123',
    session_id: 'existing-session-id',
    org_id: 'org-9',
    plan: 'pro',
    environment: 'production',
  },
});
```

== CDN

```html
<script type="module">
  import { start } from 'https://cdn.rrweb.com/browser-client/current/browser-client.js';

  start({
    publicApiKey: 'your-public-api-key-here',
    meta: {
      user_id: 'user-123',
      session_id: 'existing-session-id',
      org_id: 'org-9',
      plan: 'pro',
      environment: 'production',
    },
  });
</script>
```

:::

### Override rrweb recording options {#overriding-rrweb-config}

Pass rrweb record options alongside `publicApiKey` in the `start()` config; review Cloud defaults and compatibility in [Recording and privacy settings](/cloud/recording-settings) before overriding them. See the [rrweb record options](/guide#record-options) for the complete shared API.

:::tabs key:codesample
== NPM

```javascript
import { start } from '@rrweb/browser-client';

start({
  publicApiKey: 'your-public-api-key-here',
  meta: {
    session_id: 'existing-session-id',
  },
  blockSelector: '.my-block-class',
  inlineImages: false,
  recordCanvas: false,
});
```

== CDN

```html
<script type="module">
  import { start } from 'https://cdn.rrweb.com/browser-client/current/browser-client.js';

  start({
    publicApiKey: 'your-public-api-key-here',
    meta: {
      session_id: 'existing-session-id',
    },
    blockSelector: '.my-block-class',
    inlineImages: false,
    recordCanvas: false,
  });
</script>
```

:::

## Browser Client API {#browser-client-api}

### `start()` {#start}

Starts a recording and sets up websocket ingestion. This wraps rrweb recording and the rrweb Cloud transport.

```javascript
import { start } from '@rrweb/browser-client';

start({
  publicApiKey: 'your-public-api-key-here',
});
```

### `getRecordingId()` {#getrecordingid}

Every recording made by the browser client is associated with a recording ID stored in [browser sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage). This distinguishes separate tabs in a multi-tab browsing session.

If you call `getRecordingId()` before `start()`, the browser client creates an ID that is later used when recording starts. If the recording ID is `null`, session recording is not possible because the ID is the primary key used to store recording data server-side.

```javascript
import { getRecordingId } from '@rrweb/browser-client';

const recordingId = getRecordingId();

if (recordingId) {
  console.log(`
    recording can be retrieved from
    https://api.rrweb.com/recordings/${recordingId}
  `);
} else {
  console.log('recording not possible due to sessionStorage restrictions');
}
```

### `addMeta()` {#addmeta}

`addMeta()` associates keys and values with a recording. These can later be used when [retrieving](/operations/get-recordings) lists of recordings.

See also the equivalent API endpoint: [POST /recordings/{recordingId}/metadata](/operations/post-recordings-%7BrecordingId%7D-metadata).

If you call `addMeta()` multiple times, new keys are added and existing keys are updated.

```javascript
import { addMeta } from '@rrweb/browser-client';

addMeta({
  user_id: 'user-123',
  org_id: 'org-9',
  plan: 'pro',
  environment: 'production',
});
```

The default client export exposes the same methods if you prefer grouped access:

```javascript
import rrwebClient from '@rrweb/browser-client';

rrwebClient.addMeta({
  user_id: 'user-123',
});
```

### `addPageviewMeta()` {#addpageviewmeta}

`addPageviewMeta()` associates keys and values with the current page view. Use this when the metadata should describe the current URL or route instead of the whole recording.

```javascript
import { addPageviewMeta } from '@rrweb/browser-client';

addPageviewMeta({
  route_name: 'Checkout',
  experiment: 'new-payment-flow',
});
```

### `addCustomEvent()` {#addcustomevent}

`addCustomEvent()` queues a custom rrweb event. Use it for application-specific moments that should be visible during replay.

```javascript
import { addCustomEvent } from '@rrweb/browser-client';

addCustomEvent('cart-updated', {
  item_count: 3,
});
```

### `stop(false)` {#stop-false}

`stop(false)` immediately stops the underlying rrweb recorder and disconnects the websocket connection without clearing the recording ID. You can call [`start()`](#start) again on the same page. The next recording starts with a new rrweb FullSnapshot event and continues under the current recording ID.

```javascript
import { stop } from '@rrweb/browser-client';

stop(false);
```

### `stop(true)` {#stop-true}

Calling `stop(true)` also clears the `recordingId` from storage. The next [`start()`](#start) call uses a fresh recording ID. This can be useful when you assign session IDs through metadata and want a new browser session to start with a FullSnapshot.

```javascript
import { stop } from '@rrweb/browser-client';

stop(true);
```

## Start recording manually from the CDN {#cdn-manual-start}

Import the CDN module and call `start()` when your application is ready, for example after checking whether the session should be recorded.

```html
<script type="module">
  import { start } from 'https://cdn.rrweb.com/browser-client/current/browser-client.js';

  if (shouldRecordSession()) {
    start({
      publicApiKey: 'your-public-api-key-here',
      includePii: false,
    });
  }
</script>
```
