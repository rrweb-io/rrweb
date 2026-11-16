---
"@rrweb/browser-client": patch
---

Resume uploads after WebSocket reconnects and coordinate HTTP fallback across periodic and lifecycle flushes. Bound retries, request duration, and retained event data; preserve failed-batch ordering, prevent overlapping uploads and unhandled fetch rejections, and retain retry state across freeze/resume.
