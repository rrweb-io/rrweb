---
"@rrweb/browser-client": patch
---

Resume sending over the WebSocket after it reconnects, keep the POST fallback running whenever the socket can't take events, keep events when a fallback POST fails at the network level, and keep fallback POSTs in order and tied to one recording
