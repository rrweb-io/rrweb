---
"rrweb": patch
---

Release each recorder's mutation buffers when its observers stop, and retain only the timestamp needed for full-snapshot checkout timing. This prevents discarded snapshots from accumulating across recording sessions. Cancel deferred shadow stylesheet setup on teardown.
