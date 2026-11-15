---
"rrweb": patch
---

Keep cross-origin iframes visible in replays after the recording frame takes another full snapshot (a checkout or `record.takeFullSnapshot()`). The parent now asks recorders in its cross-origin iframes for a new full snapshot, which they also pass on to their own cross-origin iframes.
