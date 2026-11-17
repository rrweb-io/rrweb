---
"rrweb": patch
---

fix(replay): do not drop removals from mutation events when their node is missing from the mirror; the filtered list is no longer written back to the event, so seeking or replaying again still removes the node
