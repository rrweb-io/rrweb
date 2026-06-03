# @rrweb/replay

This package contains all the necessary code to replay recorded events.

## Installation

### 1) Bundler / npm (Recommended)

```bash
npm install @rrweb/replay
```

```js
import { Replayer } from '@rrweb/replay';
import '@rrweb/replay/dist/style.css';
```

### 2) Browser Without Bundler (ESM + import maps)

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@rrweb/replay@latest/dist/style.css"
/>
<script type="importmap">
  {
    "imports": {
      "@rrweb/replay": "https://cdn.jsdelivr.net/npm/@rrweb/replay@latest/+esm"
    }
  }
</script>
<script type="module">
  import { Replayer } from '@rrweb/replay';
</script>
```

### 3) Legacy Direct `<script>` Include (UMD fallback)

Use this only for compatibility with non-module environments.

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@rrweb/replay@latest/dist/style.css"
/>
<script src="https://cdn.jsdelivr.net/npm/@rrweb/replay@latest/umd/replay.min.js"></script>
```

The legacy UMD global is `rrwebReplay`.

## Usage

```js
import { Replayer } from '@rrweb/replay';
import '@rrweb/replay/dist/style.css';

const replayer = new Replayer(events, {
  // options
});
replayer.play();
```

## Notes

Currently this package is really just a wrapper around the `Replayer` class in the main `rrweb` package.
All `Replayer` related code will get moved here in the future.
