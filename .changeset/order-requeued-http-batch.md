---
"@rrweb/browser-client": patch
---

Preserve event order when an HTTP fallback upload fails. The failed batch is now re-queued at the front of the buffer, ahead of events that were recorded while the request was in flight, instead of being appended to the back and arriving out of order.
