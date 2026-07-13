# @rrweb/rrweb-plugin-popup-replay

Consumes the native-popup events captured by
[`@rrweb/rrweb-plugin-popup-record`](../rrweb-plugin-popup-record) during replay.

Native `alert` / `confirm` / `prompt` boxes are blocking browser chrome, so re-showing a real
one during replay would freeze the player. Instead, this plugin surfaces each recorded popup
to a callback you provide, so you can render it however you like (a custom overlay, a log
line, a timeline marker, …).

See the [guide](../../../guide.md) for more info on rrweb.

## Installation

```sh
npm install @rrweb/rrweb-plugin-popup-replay
```

## Usage

```ts
import { Replayer } from 'rrweb';
import { getReplayPopupPlugin } from '@rrweb/rrweb-plugin-popup-replay';

const replayer = new Replayer(events, {
  plugins: [
    getReplayPopupPlugin({
      onPopup(data) {
        // data = { kind, message, defaultValue?, returnValue? }
        console.log('popup replayed', data);
      },
    }),
  ],
});
```

## Options

| Option | Type | Description |
| --- | --- | --- |
| `onPopup` | `(data: PopupData) => void` | Called for every recorded popup as it is replayed. |
