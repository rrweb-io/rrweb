---
"@rrweb/all": patch
"@rrweb/packer": patch
"@rrweb/rrweb-plugin-canvas-webrtc-record": patch
"@rrweb/rrweb-plugin-canvas-webrtc-replay": patch
"@rrweb/rrweb-plugin-console-record": patch
"@rrweb/rrweb-plugin-console-replay": patch
"@rrweb/rrweb-plugin-sequential-id-record": patch
"@rrweb/rrweb-plugin-sequential-id-replay": patch
"@rrweb/record": patch
"@rrweb/replay": patch
"rrdom": patch
"rrdom-nodejs": patch
"rrweb": patch
"rrweb-player": patch
"rrweb-snapshot": patch
"@rrweb/types": patch
"@rrweb/utils": patch
---

Provide a /umd/ output folder alongside the /dist/ one so that we can serve UMD (Universal Module Definition) files with a .js extension, without upsetting expectations set by package.json that all .js files in /dist/ are modules
