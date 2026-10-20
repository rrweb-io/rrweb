---
"rrweb-snapshot": patch
---

`Mirror.removeNodeFromMap` also removes the shadow trees of removed hosts, so replacing web components no longer keeps their detached shadow trees in the mirror.
