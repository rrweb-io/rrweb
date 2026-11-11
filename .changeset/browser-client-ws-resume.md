---
"@rrweb/browser-client": patch
---

Resume sending over the WebSocket after it reconnects, keep the fallback POST timer running for the life of the connection, keep events when a fallback POST fails at the network level, and keep in-flight fallback POSTs from leaking events between recordings across stop()/start()
