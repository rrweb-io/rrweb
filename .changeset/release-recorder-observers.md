---
"rrweb": patch
"@rrweb/record": patch
---

Fix record side memory leaks: release observers, mutation buffers and listeners that the recorder no longer needs. Stopping a recording, taking a full snapshot, removing a shadow host, and removing or navigating a same-origin iframe each left mutation buffers registered and observers attached, so memory grew with every stop/start cycle and every checkout, and mutations inside same-origin iframes were recorded once more for every full snapshot taken. Cross-origin iframe message listeners are now also removed when recording stops.
