# @rrweb/replay

This package contains all the necessary code to replay recorded events.

## Installation

```bash
npm install @rrweb/replay
```

## Usage

```js
import { Replayer } from '@rrweb/replay';

const replayer = new Replayer(events, {
  // options
});
replayer.play();
```

## Notes

Currently this package is really just a wrapper around the `Replayer` class in the main `rrweb` package.
All `Replayer` related code will get moved here in the future.
