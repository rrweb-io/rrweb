# @rrweb/rrweb-plugin-sequential-id-record

Use this plugin in combination with the [@rrweb/rrweb-plugin-sequential-id-replay](../rrweb-plugin-sequential-id-replay) plugin to record and replay events with a sequential id.

## Installation

```bash
npm install @rrweb/rrweb-plugin-sequential-id-record
```

## Usage

```js
import rrweb from 'rrweb';
import { getRecordSequentialIdPlugin } from '@rrweb/rrweb-plugin-sequential-id-record';

rrweb.record({
  emit: function emit(event) {
    // send events to server
  },
  plugins: [
    getRecordSequentialIdPlugin({
      key: '_sid', // default value
    }),
  ],
});
```
