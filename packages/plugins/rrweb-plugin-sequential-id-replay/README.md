# @rrweb/rrweb-plugin-sequential-id-replay

Use this plugin in combination with the [@rrweb/rrweb-plugin-sequential-id-record](../rrweb-plugin-sequential-id-record) plugin to record and replay events with a sequential id.

## Installation

```bash
npm install @rrweb/rrweb-plugin-sequential-id-replay
```

## Usage

```js
import rrweb from 'rrweb';
import { getReplaySequentialIdPlugin } from '@rrweb/rrweb-plugin-sequential-id-replay';

const replayer = new rrweb.Replayer(events, {
  plugins: [
    getReplaySequentialIdPlugin({
      // make sure this is the same as the record side
      key: '_id', // default value
      warnOnMissingId: true, // default value
    }),
  ],
});
replayer.play(); // ERROR: [sequential-id-plugin]: expect to get an id with value "42", but got "666"`
```
