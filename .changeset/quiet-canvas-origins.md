---
"@rrweb/rrweb-plugin-canvas-webrtc-record": patch
---

Reject cross-origin canvas WebRTC commands by default. Cross-origin streaming now requires `recordCrossOriginIframes: true` in each participating recording plugin instance, separately from rrweb's recording option. Only enable this option for pages whose embedding origins are trusted.
