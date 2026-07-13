# @rrweb/rrweb-plugin-dialog-record

Records native browser dialogs — `window.alert`, `window.confirm`, and `window.prompt` —
that are otherwise invisible to rrweb because they are rendered as browser chrome outside the
DOM. The plugin captures the dialog message, `prompt`'s default value, and the user's
response (the boolean from `confirm`, the string from `prompt`).

Pair it with [`@rrweb/rrweb-plugin-dialog-replay`](../rrweb-plugin-dialog-replay) to surface
the captured dialogs during replay.

See the [guide](../../../guide.md) for more info on rrweb.

## Installation

```sh
npm install @rrweb/rrweb-plugin-dialog-record
```

## Usage

```ts
import { record } from 'rrweb';
import { getRecordDialogPlugin } from '@rrweb/rrweb-plugin-dialog-record';

record({
  emit(event) {
    // store the event
  },
  plugins: [getRecordDialogPlugin()],
});
```

Each captured dialog is emitted as an rrweb Plugin event with this payload shape:

```ts
type DialogData = {
  kind: 'alert' | 'confirm' | 'prompt';
  message: string;
  defaultValue?: string; // prompt's second argument, when provided
  returnValue?: boolean | string | null; // confirm → boolean, prompt → string | null; omitted for alert
};
```

Note: because native dialogs are synchronous and blocking, the plugin calls through to the
real dialog first (so the page behaves exactly as before) and records the user's response
once they dismiss it.

## Options

```ts
getRecordDialogPlugin({
  // Which dialogs to hook. Defaults to all three.
  level: ['alert', 'confirm', 'prompt'],

  // Whether to record the user's response for confirm / prompt. Defaults to true.
  recordReturnValue: true,

  // Redact sensitive content just before it is recorded.
  maskDialog: (data) => ({ ...data, message: '***', returnValue: '***' }),
});
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `level` | `('alert' \| 'confirm' \| 'prompt')[]` | all three | Which native dialogs to hook. |
| `recordReturnValue` | `boolean` | `true` | Record the `confirm`/`prompt` response. `alert` never has a return value. |
| `maskDialog` | `(data: DialogData) => DialogData` | — | Transform the payload before it is emitted, e.g. to redact PII. |
