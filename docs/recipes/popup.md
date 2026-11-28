# Popup Recorder and Replayer

Native browser popups — `window.alert`, `window.confirm`, and `window.prompt` — are rendered as browser chrome outside the DOM, so rrweb does not capture them by default. This plugin records them (the message, a `prompt`'s default value, and the user's response) and lets you surface them during replay.

### Enable Recording Popups

You can enable using the default options like this:

```js
import { record } from '@rrweb/record';
import { getRecordPopupPlugin } from '@rrweb/rrweb-plugin-popup-record';

record({
  emit: function emit(event) {
    events.push(event);
  },
  // to use default record options
  plugins: [getRecordPopupPlugin()],
});
```

Each captured popup is emitted as a Plugin event with the following payload:

```ts
type PopupData = {
  kind: 'alert' | 'confirm' | 'prompt';
  message: string;
  defaultValue?: string; // prompt's second argument, when provided
  returnValue?: boolean | string | null; // confirm → boolean, prompt → string | null; omitted for alert
};
```

Because native popups are synchronous and blocking, the plugin calls through to the real popup first (so the page behaves exactly as before) and records the user's response once they dismiss it.

You can also customize the behavior like this:

```js
import { record } from '@rrweb/record';
import { getRecordPopupPlugin } from '@rrweb/rrweb-plugin-popup-record';

record({
  emit: function emit(event) {
    events.push(event);
  },
  // customized record options
  plugins: [
    getRecordPopupPlugin({
      // only hook confirm and prompt, ignore alert
      popupKinds: ['confirm', 'prompt'],
      // redact sensitive content before it is recorded
      maskPopupData: (data) => {
        return { ...data, message: maskTextFn(data.message) };
      },
    }),
  ],
});
```

Use `maskPopupData` to redact anything sensitive, **including the user's response**. Return a modified copy to mask the `message`, or drop `returnValue` entirely to avoid recording what the user typed into a `prompt` or answered in a `confirm`:

```js
getRecordPopupPlugin({
  // record that a popup happened, but never store the user's response
  maskPopupData: ({ returnValue, ...rest }) => rest,
});
```

All options are described below:

| key           | default                          | description                                                                                                                    |
| ------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| popupKinds    | `['alert', 'confirm', 'prompt']` | Which native popups to hook. Override it to record only a subset.                                                               |
| maskPopupData | `(data) => data`                 | Transform the payload before it is emitted, e.g. to mask the `message` or drop the `returnValue` to hide the user's response.   |

## Replay Popups

A native popup is a blocking browser dialog, so re-showing a real one during replay would freeze the player. Instead it is up to you to decide how to best replay your popup events using the `onPopup` callback (e.g. render a custom overlay, log a line, or add a timeline marker).

```js
import rrweb from 'rrweb';
import { getReplayPopupPlugin } from '@rrweb/rrweb-plugin-popup-replay';

const replayer = new rrweb.Replayer(events, {
  plugins: [
    getReplayPopupPlugin({
      onPopup: (data) => {
        const { kind, message, returnValue } = data;
        console.log(`${kind}: ${message} -> ${returnValue}`);
      },
    }),
  ],
});
replayer.play();
```

Description of the replay option is as follows:

| key     | default     | description                                                        |
| ------- | ----------- | ------------------------------------------------------------------ |
| onPopup | `undefined` | Called for every recorded popup as it is replayed, with `PopupData`. |

## Technical Implementation

This implementation records native popups by patching [`window.alert`](https://developer.mozilla.org/en-US/docs/Web/API/Window/alert), [`window.confirm`](https://developer.mozilla.org/en-US/docs/Web/API/Window/confirm), and [`window.prompt`](https://developer.mozilla.org/en-US/docs/Web/API/Window/prompt). Since these functions are synchronous and blocking, the patched wrapper calls through to the original popup first and captures its return value (the user's response) before emitting the event. On teardown the original functions are restored.
