---
"@amplitude/rrweb": patch
---

perf(replay): player performance improvements

- Replace array shift() with index pointer for O(1) per-tick action consumption
- Collect scroll nodes during rebuild instead of O(N) post-build mirror scan
- Add checkpoint index for O(log C) seeking instead of O(N) backward scan
- Skip incremental events before the last FullSnapshot in the sync batch
- Restore duplicate event filtering in out-of-order addEvent insertions
- Move addDelay to async scheduling branch only (avoid mutating sync events)
