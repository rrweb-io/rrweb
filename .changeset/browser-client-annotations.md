---
"@rrweb/browser-client": minor
---

Expose `addAnnotation()` through named and default exports. Calls record annotations immediately during an active session or queue them with their call-time timestamp until the recorder is ready, including calls immediately after `start()` while the document is still loading.
