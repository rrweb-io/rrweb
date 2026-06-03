# @rrweb/record

This package contains all the record related code in rrweb.

## Installation

### 1) Bundler / npm (Recommended)

```bash
npm install @rrweb/record
```

```js
import { record } from '@rrweb/record';
```

### 2) Browser Without Bundler (ESM + import maps)

```html
<script type="importmap">
  {
    "imports": {
      "@rrweb/record": "https://cdn.jsdelivr.net/npm/@rrweb/record@latest/+esm"
    }
  }
</script>
<script type="module">
  import { record } from '@rrweb/record';
</script>
```

### 3) Legacy Direct `<script>` Include (UMD fallback)

Use this only for compatibility with non-module environments.

```html
<script src="https://cdn.jsdelivr.net/npm/@rrweb/record@latest/umd/record.min.js"></script>
```

The legacy UMD global is `rrwebRecord`.

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
