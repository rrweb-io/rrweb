# Browser Client Sequence ID Design

## Context

`@rrweb/browser-client` records rrweb events and sends them to an rrweb Cloud-compatible API over WebSocket, with HTTP POST fallback for buffered or oversized events. It stores the active recording ID in `sessionStorage` using `rrweb-browser-client-recording-id`, so a recording can continue across same-tab page navigations.

rrweb already has `@rrweb/rrweb-plugin-sequential-id-record`, but the current record plugin always starts at `1` and only processes events emitted through rrweb's `record()` pipeline. The browser client also creates events itself, including `recording-meta`, queued custom events, and close events. Those events need the same top-level ordering field if Cloud ingestion, Tinybird chunk manifests, and cursor pagination are going to rely on it.

## Goals

- Include `@rrweb/rrweb-plugin-sequential-id-record` in the browser-client bundle.
- Send every browser-client event to Cloud with a top-level numeric `sequenceId`.
- Continue `sequenceId` across same-tab page navigations for the same `recordingId`.
- Avoid reusing browser-client-assigned IDs even when transport failures, page freezes, or navigation interrupts happen.
- Preserve existing sequential-id plugin behavior for callers that do not use the new resume option.
- Keep the change focused on browser-client sequencing and the plugin option needed to support it.

## Non-Goals

- Do not add server-side sequencing or reconciliation.
- Do not guarantee gap-free sequences. Gaps are acceptable and useful for diagnosing capture or transport issues.
- Do not change recording ID ownership or allow caller-supplied recording IDs.
- Do not refactor browser-client transport behavior beyond routing events through the sequence helper before serialization.

## Proposed Approach

Use browser-client-owned outbound sequencing, with the existing record plugin included in the rrweb recording pipeline.

1. Add `@rrweb/rrweb-plugin-sequential-id-record` as a browser-client dependency.
2. Extend the record plugin with a `startId?: number` option. The plugin's internal counter starts from `startId`, then pre-increments as it does today. Existing default behavior still starts emitted IDs at `1`.
3. In browser-client `start()`, read the stored last sequence ID for the active `recordingId`.
4. Append `getRecordSequentialIdPlugin({ key: 'sequenceId', startId: lastSequenceId })` to `recordOptions.plugins`.
5. Add a browser-client `ensureSequenceId(event)` helper that guarantees every outbound event has a valid top-level `sequenceId`.
6. Apply `ensureSequenceId()` before every browser-client `JSON.stringify()` event path.
7. Persist the latest assigned or observed sequence ID immediately when the event is queued or sent, not after server acknowledgement.
8. Clear the persisted sequence ID when `stop(true)` clears the active recording ID.

This approach intentionally permits gaps. If an event receives a sequence ID and the browser exits before the event reaches Cloud, the next page continues after that assigned ID instead of reusing it.

## Architecture

### Sequential ID Plugin

`SequentialIdOptions` becomes:

```ts
export type SequentialIdOptions = {
  key: string;
  startId?: number;
};
```

The plugin normalizes `startId` to `0` when it is missing. With `startId: 5`, the next processed rrweb event receives `6`.

### Browser Client Sequence State

Browser-client adds helpers around a storage key derived from the active recording ID, for example:

```ts
rrweb-browser-client-sequence-id:${recordingId}
```

Reads tolerate missing, malformed, negative, non-finite, or unavailable storage values by falling back to `0`. Writes are best-effort. Because `start()` already returns early when it cannot get a recording ID, sequence storage can fail without stopping the current page's recording.

The in-memory sequence state is initialized once per `start()` call:

1. `recordingId = getSetRecordingId()`
2. `lastSequenceId = readStoredSequenceId(recordingId)`
3. `ensureSequenceId` closes over `recordingId` and `lastSequenceId`

### Event Normalization

`ensureSequenceId(event)` mutates the event before serialization:

- If `event.sequenceId` is a finite non-negative integer, keep it and advance local state to at least that value.
- If `event.sequenceId` is missing or invalid, assign `lastSequenceId + 1`.
- Persist the updated latest ID immediately.

The helper should be used for:

- the initial `recording-meta` event,
- rrweb events emitted by `recordOptions.emit`,
- queued events created by `addCustomEvent()` before recording is active,
- close events created by `stop()`,
- oversized events sent directly through POST,
- buffered WebSocket and fallback POST events.

## Data Flow

When a new recording starts, no sequence key exists for its new recording ID, so the first browser-client event receives `sequenceId: 1`.

When a same-tab navigation resumes an existing recording ID, browser-client reads the last stored sequence ID, initializes the rrweb plugin from that value, and uses the same local state for browser-client-created events. The next outbound event receives `last + 1`.

If caller-provided rrweb plugins exist, browser-client appends the sequential-id plugin after them. This keeps user event processors first and assigns the final Cloud ordering field at the end of rrweb's plugin pipeline. If a user plugin already creates a valid `sequenceId`, the browser-client helper preserves it and advances stored state.

## Error Handling

Malformed stored sequence values reset to `0`. Storage write failures are ignored after the current in-memory state has advanced.

Transport failures do not roll back sequence IDs. This avoids duplicate IDs across navigation or retries. Failed sends can therefore create gaps, and those gaps are expected.

If a user plugin creates an invalid `sequenceId`, browser-client replaces it with the next valid number. If it creates a valid value lower than the current state, browser-client preserves the event value but does not move the stored state backward.

## Testing

Add focused browser-client tests in the existing happy-dom test area or a new adjacent test file:

- `start()` appends a sequential-id plugin with `key: 'sequenceId'` and `startId` from storage.
- rrweb-emitted events get top-level `sequenceId`.
- browser-client-created `recording-meta`, `addCustomEvent()` fallback events, and `stop()` close events get top-level `sequenceId`.
- sequence state persists immediately on enqueue/send.
- same-recording resume starts from the stored sequence ID.
- `stop(true)` clears the persisted sequence key for the active recording ID.
- malformed stored sequence values recover by assigning `1`.

Add plugin-level tests for `@rrweb/rrweb-plugin-sequential-id-record`:

- default behavior still assigns `1`, then `2`,
- `startId` makes the next processed event start at `startId + 1`.

Update the browser-client integration expectations so returned server events explicitly assert numeric, increasing `sequenceId` values instead of only deleting the field before comparison. If Cloud returns extra fields that still need to be ignored for deep event comparison, keep that normalization after the explicit `sequenceId` assertion.

## Verification

Run focused verification after implementation:

```sh
yarn workspace @rrweb/rrweb-plugin-sequential-id-record check-types
yarn workspace @rrweb/rrweb-plugin-sequential-id-record build
yarn workspace @rrweb/browser-client check-types
yarn workspace @rrweb/browser-client build
yarn workspace @rrweb/browser-client retest
```

If a plugin test script is added, run that package's test command as well.

## Risks

The browser-client must normalize every serialization path. Missing one path would reintroduce null or absent `sequenceId` values.

The plugin and browser-client helper both touch `sequenceId` for rrweb-emitted events. They must share the same starting state so they do not diverge during normal recording.

Preserving valid user-supplied `sequenceId` values means a user plugin can still create duplicates if it intentionally or accidentally emits lower values. Browser-client prevents reuse for IDs it assigns itself.

Persisting on enqueue/send can create gaps when events are lost before reaching Cloud. This is intentional, but tests should verify no duplicate IDs are created during resume.
