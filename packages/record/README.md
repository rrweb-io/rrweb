# @rrweb/record

This package contains all the record related code in rrweb.

## Installation

```bash
npm install @rrweb/record
```

## Usage

```js
import { record } from '@rrweb/record';

record({
  emit(event) {
    // send event to server
  },
});
```

## Notes

Currently this package is really just a wrapper around the `record` function in the main `rrweb` package.
All `record` related code will get moved here in the future.
