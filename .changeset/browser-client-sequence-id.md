---
"@rrweb/browser-client": patch
---

Number each uploaded event with a per-recording `sequenceId`, so the server can order events that share a timestamp or arrive late.
