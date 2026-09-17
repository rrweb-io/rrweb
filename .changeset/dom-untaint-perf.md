---
"rrweb": patch
"@rrweb/record": patch
---

Improve performance of untainted `dom` accessors. Since #1509 we use e.g. `dom.parentNode(el)` instead of `el.parentNode` to work around libraries that modify these accessors. Slight improvement to avoid a string allocation each time one of these is called; they are on every hot path.
