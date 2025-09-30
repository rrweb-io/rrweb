---
"@newrelic/rrweb-replay": patch
"@newrelic/rrweb-player": patch
---

Fix mismatch between declared entry points and built artifact filenames (`replay.*` vs `rrweb-replay.*`) causing `@newrelic/rrweb-player` build failure. Updated `@newrelic/rrweb-replay` package.json `main/module/exports` to match generated `rrweb-replay.*` files and rebuilt player.

Impact:
- Consumers relying on package root import (`import { Replayer } from '@newrelic/rrweb-replay'`) require no change.
- Any tooling that previously looked for `dist/replay.js` must now look for the new canonical filename `dist/rrweb-replay.js` (or, preferably, use the package root specifier).
