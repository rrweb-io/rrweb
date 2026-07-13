# @rrweb/rrweb-plugin-popup-record

Records native browser popups — `window.alert`, `window.confirm`, and `window.prompt` —
that are otherwise invisible to rrweb because they are rendered as browser chrome outside the
DOM. The plugin captures the popup message, `prompt`'s default value, and the user's
response (the boolean from `confirm`, the string from `prompt`).

Pair it with [`@rrweb/rrweb-plugin-popup-replay`](../rrweb-plugin-popup-replay) to surface
the captured popups during replay.

See the [guide](../../../guide.md) for more info on rrweb.

## Installation

```sh
npm install @rrweb/rrweb-plugin-popup-record
```

## Usage

```ts
import { record } from 'rrweb';
import { getRecordPopupPlugin } from '@rrweb/rrweb-plugin-popup-record';

record({
  emit(event) {
    // store the event
  },
  plugins: [getRecordPopupPlugin()],
});
```

Each captured popup is emitted as an rrweb Plugin event with this payload shape:

```ts
type PopupData = {
  kind: 'alert' | 'confirm' | 'prompt';
  message: string;
  defaultValue?: string; // prompt's second argument, when provided
  returnValue?: boolean | string | null; // confirm → boolean, prompt → string | null; omitted for alert
};
```

Note: because native popups are synchronous and blocking, the plugin calls through to the
real popup first (so the page behaves exactly as before) and records the user's response
once they dismiss it.

## Options

```ts
getRecordPopupPlugin({
  // Which popups to hook. Defaults to all three.
  level: ['alert', 'confirm', 'prompt'],

  // Whether to record the user's response for confirm / prompt. Defaults to true.
  recordReturnValue: true,

  // Redact sensitive content just before it is recorded.
  maskPopup: (data) => ({ ...data, message: '***', returnValue: '***' }),
});
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `level` | `('alert' \| 'confirm' \| 'prompt')[]` | all three | Which native popups to hook. |
| `recordReturnValue` | `boolean` | `true` | Record the `confirm`/`prompt` response. `alert` never has a return value. |
| `maskPopup` | `(data: PopupData) => PopupData` | — | Transform the payload before it is emitted, e.g. to redact PII. |
