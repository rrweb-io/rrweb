---
"@rrweb/rrweb-plugin-network-record": patch
---

Record each request's `startTime` and `endTime` at the sub-millisecond precision the browser reports, instead of rounding them to whole milliseconds, so `endTime - startTime` matches `duration`
