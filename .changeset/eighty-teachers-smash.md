---
"@rrweb/rrweb-plugin-canvas-webrtc-replay": patch
"@rrweb/rrweb-plugin-sequential-id-replay": patch
"@rrweb/rrweb-plugin-console-replay": patch
"rrweb": patch
---

Export `ReplayPlugin` from rrweb directly. Previously we had to do `import type { ReplayPlugin } from 'rrweb/dist/types';` now we can do `import type { ReplayPlugin } from 'rrweb';`
