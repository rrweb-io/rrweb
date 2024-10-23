---
"@amplitude/rrweb-plugin-canvas-webrtc-replay": patch
"@amplitude/rrweb-plugin-sequential-id-replay": patch
"@amplitude/rrweb-plugin-console-replay": patch
"@amplitude/rrweb": patch
---

Export `ReplayPlugin` from rrweb directly. Previously we had to do `import type { ReplayPlugin } from 'rrweb/dist/types';` now we can do `import type { ReplayPlugin } from 'rrweb';`
