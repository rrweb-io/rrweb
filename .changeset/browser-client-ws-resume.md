---
"@rrweb/browser-client": patch
---

Resume sending over the WebSocket after it reconnects, keep the fallback POST timer running for the life of the connection, keep events when a fallback POST fails at the network level, keep in-flight fallback POSTs from leaking events between recordings across stop()/start(), flush queued events (and the close event) under the current recording id on stop() instead of discarding them, and keep the fallback POSTing later events when an earlier POST never answers
