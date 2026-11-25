---
"rrdom": patch
"@rrweb/replay": patch
---

fix that after a skip forward which passed over scrolling, followed by a skip back to an earlier full snapshot, a stale scroll offset would be applied to the iframe window
