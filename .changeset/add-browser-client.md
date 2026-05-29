---
"@rrweb/browser-client": patch
"@rrweb/utils": patch
---

Add the rrweb browser client package and move `nowTimestamp` into `@rrweb/utils` so the client can avoid importing through `rrweb/utils`.
