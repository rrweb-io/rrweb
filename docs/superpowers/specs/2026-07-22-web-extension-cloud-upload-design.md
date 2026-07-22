# Web Extension Cloud Upload Design

## Goal

Add completed-session uploads to the rrweb browser extension without changing
recording startup or session identity behavior. The extension will upload to
`https://api.rrweb.com` by default, while allowing users to configure another
HTTP or HTTPS API base URL.

## Scope

The feature includes:

- an Upload action for selected saved sessions;
- a settings screen for an API base URL and bearer token;
- local-only credential storage;
- NDJSON serialization with Brotli, gzip, and raw fallbacks;
- per-session success and error feedback; and
- automated tests for configuration, request construction, fallbacks, and
  partial failures.

The feature deliberately excludes automatic recording, page-to-extension
session ID bridges, and any change to how recordings receive IDs. Those changes
belong in a separate pull request.

## Architecture

`src/utils/storage.ts` remains responsible only for IndexedDB session and event
storage. A new `src/utils/cloud-upload.ts` module owns configuration
normalization, NDJSON serialization, compression selection, URL construction,
and the HTTP request. This boundary keeps network behavior independently
testable and prevents storage code from accumulating transport concerns.

`src/options/Settings.tsx` reads and writes cloud configuration through
`Browser.storage.local`. The API token is never placed in sync storage. The API
base URL defaults to `https://api.rrweb.com`, is normalized by removing trailing
slashes, and must use HTTP or HTTPS. The upload endpoint is constructed as
`<baseUrl>/recordings/<encodedSessionId>/ingest`.

`src/pages/SessionList.tsx` retrieves selected session IDs, delegates them to
the upload module, and presents aggregate success or per-session failure
messages. It does not access credentials or construct network requests.

## Configuration and Credentials

The cloud settings shape is:

```ts
type CloudSettings = {
  apiBaseUrl: string;
  authToken: string;
};
```

Defaults are applied when settings are missing or incomplete. The token input
uses a password field. Saving an empty token is allowed, but upload attempts
fail before reading session payloads or issuing a request. No token or event
payload is written to logs.

HTTP is accepted to support local development; production users receive the
HTTPS default. Unsupported URL protocols and malformed URLs are rejected with
a settings validation error.

## Upload Data Flow

For each selected session, the upload module:

1. loads session metadata and recorded events;
2. serializes each event as one JSON line;
3. attempts Brotli compression when the runtime supports it;
4. falls back to gzip when Brotli is unavailable or fails;
5. falls back to the raw NDJSON string when compression is unavailable;
6. sends one POST request with `Authorization: Bearer <token>` and
   `Content-Type: application/x-ndjson`;
7. includes `Content-Encoding` only for compressed bodies; and
8. records success or a concise error for that session before continuing.

Session IDs are URL-encoded. Non-success HTTP responses include status and
status text in the result without exposing response bodies that might contain
sensitive information.

## Error Handling

Missing credentials and invalid API URLs fail before network activity. Missing
session metadata or events fail only that session. Compression failures degrade
to the next supported encoding rather than aborting an upload. A failed request
does not prevent remaining selected sessions from being attempted.

The UI distinguishes complete success, partial failure, and total failure.
Errors remain visible through Chakra toasts and name the affected saved session.

## Testing

The extension package will gain a focused Vitest configuration and unit tests.
Pure transport helpers will cover:

- the `https://api.rrweb.com` default;
- trailing-slash normalization and encoded session IDs;
- rejection of malformed or unsupported URLs;
- missing-token short-circuiting;
- Brotli, gzip, and raw-body request headers;
- bearer authorization without credential logging;
- non-success HTTP responses; and
- continuation after individual session failures.

Verification will run the extension unit tests, TypeScript checking, and both
Chrome and Firefox production builds.

## Git Strategy

Implementation lives in the isolated worktree
`/Users/justin/.config/superpowers/worktrees/rrweb/web-extension-cloud-upload`
on branch `codex/web-extension-cloud-upload`. Only the curated upload/settings
changes will be ported; unrelated modifications from the source workspace will
not be copied.
