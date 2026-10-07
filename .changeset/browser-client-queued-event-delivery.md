---
"@rrweb/browser-client": patch
---

Deliver queued custom events and annotations through the configured `emit` callback when the recorder is ready, preserving their original call-time timestamps. Previously, queued events bypassed the callback and were sent only to the server.

Queue custom events added while the document is still loading instead of calling the recorder before it is ready and throwing an error.
