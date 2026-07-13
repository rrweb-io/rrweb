# @rrweb/rrweb-plugin-dialog-replay

Consumes the native-dialog events captured by
[`@rrweb/rrweb-plugin-dialog-record`](../rrweb-plugin-dialog-record) during replay.

Native `alert` / `confirm` / `prompt` boxes are blocking browser chrome, so re-showing a real
one during replay would freeze the player. Instead, this plugin surfaces each recorded dialog
to a callback you provide, so you can render it however you like (a custom overlay, a log
line, a timeline marker, …).

See the [guide](../../../guide.md) for more info on rrweb.

## Installation

```sh
npm install @rrweb/rrweb-plugin-dialog-replay
```

## Usage

```ts
import { Replayer } from 'rrweb';
import { getReplayDialogPlugin } from '@rrweb/rrweb-plugin-dialog-replay';

const replayer = new Replayer(events, {
  plugins: [
    getReplayDialogPlugin({
      onDialog(data) {
        // data = { kind, message, defaultValue?, returnValue? }
        console.log('dialog replayed', data);
      },
    }),
  ],
});
```

## Options

| Option | Type | Description |
| --- | --- | --- |
| `onDialog` | `(data: DialogData) => void` | Called for every recorded dialog as it is replayed. |
