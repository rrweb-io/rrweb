---
"@rrweb/browser-client": patch
---

Fix HTTP fallback uploads resending earlier successful batches when flushing a large event buffer. Failed uploads now requeue only their own batch.
