# Dialog Plugin Design — recording `alert` / `confirm` / `prompt`

Date: 2026-07-13

## Problem

rrweb records the DOM (initial snapshot + `MutationObserver` + event listeners), so
DOM-based popups (`<dialog>`, custom modal `<div>`s) are captured and replayed. But the
native, blocking browser dialogs — `window.alert`, `window.confirm`, `window.prompt` — are
rendered as browser chrome outside the DOM. rrweb has no hook for them today, so neither the
fact that a dialog appeared nor the user's response is recorded.

## Goal

A record/replay plugin **pair** (mirroring the console and network plugins) that captures
native `alert` / `confirm` / `prompt` calls — including the message, `prompt`'s default
value, and the user's response — and surfaces them during replay via a callback.

Because these functions are **synchronous and blocking**, a monkey-patch can call through to
the real dialog, capture its return value after the user responds, and emit an rrweb Plugin
event. No async plumbing is required.

## Non-goals

- Re-showing a real blocking native dialog during replay (would freeze the replayer UI).
- A built-in visual overlay renderer for replay. Replay is **callback-only**; the consumer
  decides how to surface the data. (An overlay could be added later as an opt-in without
  breaking this design.)
- Capturing dialogs from other sources (e.g. `beforeunload` confirmation, `print`).

## Packages

Two new packages under `packages/plugins/`, lockstep-versioned at `2.1.0`, following the
existing plugin conventions (Vite library build, `@rrweb/types` + `@rrweb/utils` as
peer + dev deps, turbo `prepublish`):

- `@rrweb/rrweb-plugin-dialog-record`
- `@rrweb/rrweb-plugin-dialog-replay` — dev-depends on the record twin to import
  `PLUGIN_NAME` and the shared `DialogData` type.

Shared identifier, exported from the record package:

```ts
export const PLUGIN_NAME = 'rrweb/dialog@1';
```

Factory naming follows convention: `getRecordDialogPlugin(options?)` and
`getReplayDialogPlugin(options)`.

## Data model

```ts
export type DialogKind = 'alert' | 'confirm' | 'prompt';

export type DialogData = {
  kind: DialogKind;
  message: string;                          // 1st arg to alert/confirm/prompt (coerced to string)
  defaultValue?: string;                    // prompt's 2nd arg; present only for kind === 'prompt' when supplied
  returnValue?: boolean | string | null;    // confirm→boolean, prompt→string|null; omitted for alert or when disabled
};
```

rrweb wraps whatever the observer passes to `cb()` into:

```ts
{ type: EventType.Plugin, data: { plugin: 'rrweb/dialog@1', payload: DialogData } }
```

with rrweb's own event timestamp, so the payload carries **no** custom timing field.

## Record plugin (`rrweb-plugin-dialog-record`)

### Options

```ts
export type DialogRecordOptions = {
  level?: DialogKind[];                          // which dialogs to hook; default ['alert', 'confirm', 'prompt']
  recordReturnValue?: boolean;                   // capture confirm/prompt result; default true
  maskDialog?: (data: DialogData) => DialogData; // redaction hook applied just before emit
};
```

### Observer behavior

For each kind in `level`, patch `win[kind]` using `patch()` from `@rrweb/utils` (stores the
original under a non-enumerable `__rrweb_original__` and returns a restore function).

The wrapper, on each call:

1. Calls the **original** dialog first (`original.apply(this, args)`). This blocks until the
   user responds, which is exactly how we obtain the user's answer for `confirm`/`prompt`.
2. Builds `DialogData`:
   - `kind` = the patched kind.
   - `message` = `String(args[0] ?? '')`.
   - `defaultValue` = for `prompt` only, `String(args[1])` when `args[1] != null`.
   - `returnValue` = the value from step 1, included only when
     `recordReturnValue !== false` **and** `kind !== 'alert'`.
3. If `maskDialog` is provided, replaces `data` with `maskDialog(data)`.
4. Emits via `cb(data)`.
5. Returns the original return value to the calling page (transparent passthrough).

The observer returns a teardown that restores every patched method.

Runs per-window via rrweb's existing plugin-per-window wiring, so same-origin iframes and the
top window are each patched.

### Correctness points

- `alert` → `returnValue` omitted (native returns `undefined`).
- `confirm` → `returnValue` is a `boolean`.
- `prompt` → `returnValue` is a `string`, or `null` when the user cancels.
- `recordReturnValue: false` → omit `returnValue` for `confirm`/`prompt`.
- `level` subset → only listed kinds are patched; others are untouched.
- Passthrough return preserves page behavior exactly.
- Idempotent teardown restores the exact original references.

### Type note

Like network-record, the typed observer signature (`(cb: (data: DialogData) => void, win,
options) => listenerHandler`) is narrower than `RecordPlugin['observer']`, so the factory
casts `observer: initDialogObserver as RecordPlugin['observer']`.

## Replay plugin (`rrweb-plugin-dialog-replay`)

### Options

```ts
export type DialogReplayOptions = {
  onDialog: (data: DialogData) => void;
};
```

### Handler behavior

```ts
export const getReplayDialogPlugin: (options: DialogReplayOptions) => ReplayPlugin =
  (options) => ({
    handler(event) {
      if (event.type === EventType.Plugin && event.data.plugin === PLUGIN_NAME) {
        options.onDialog(event.data.payload as DialogData);
      }
    },
  });
```

Mirrors network-replay exactly — filter by plugin name, hand the payload to the consumer.

## Testing

Primary pattern: Vitest unit tests with a mock window (network-record's approach), which is a
clean fit since native dialogs are trivially stubbed.

For record:
- Stub `win.alert` / `win.confirm` / `win.prompt` on a mock window (with controllable return
  values).
- Call `plugin.observer(captureCb, mockWin, plugin.options)`, invoke the dialogs, assert the
  captured `DialogData[]`, then call teardown and assert the originals are restored.
- Cases: `alert` (no `returnValue`); `confirm` true/false; `prompt` returns typed string;
  `prompt` cancel → `null`; `prompt` `defaultValue`; `recordReturnValue: false` omits
  `returnValue`; `maskDialog` transforms the payload; `level` subset patches only the listed
  kinds; passthrough returns the original value to the caller.

For replay:
- Feed a synthetic `EventType.Plugin` event with `plugin === PLUGIN_NAME` and assert
  `onDialog` receives the payload; feed an unrelated event and assert it is ignored.

## Tooling / files per package

Copied from the network plugin templates:

- `rrweb-plugin-dialog-record/`: `package.json`, `tsconfig.json`, `vite.config.ts`,
  `vitest.config.ts`, `src/index.ts`, `test/index.test.ts`, `README.md`.
- `rrweb-plugin-dialog-replay/`: `package.json`, `tsconfig.json`, `vite.config.ts`,
  `src/index.ts`, `README.md`.

`vite.config.ts` uses the shared `vite.config.default` factory with entry `src/index.ts` and
UMD names `rrwebPluginDialogRecord` / `rrwebPluginDialogReplay`. `package.json` names,
exports, scripts, and peer/dev deps mirror the network plugin at version `2.1.0`. A changeset
should be added for the two new packages.
