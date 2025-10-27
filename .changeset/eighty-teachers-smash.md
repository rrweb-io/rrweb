---
"@junify-app/rrweb-plugin-canvas-webrtc-replay": patch
"@junify-app/rrweb-plugin-sequential-id-replay": patch
"@junify-app/rrweb-plugin-console-replay": patch
"@junify-app/rrweb": patch
---

Export `ReplayPlugin` from rrweb directly. Previously we had to do `import type { ReplayPlugin } from 'rrweb/dist/types';` now we can do `import type { ReplayPlugin } from '@junify-app/rrweb';`
