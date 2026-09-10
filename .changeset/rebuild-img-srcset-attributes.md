---
"rrweb-snapshot": patch
---

Fix rebuild dropping every attribute (id, class, style, src, ...) from an inlined `<img>` that has a `srcset`. Only `srcset` is now moved to `rrweb-original-srcset`; the other attributes are set as usual.
