---
'rrweb-snapshot': patch
---

Avoid recreating the same element every time, instead, we cache and we just update the element.

Before: 779k ops/s
After: 860k ops/s

Benchmark: https://jsbench.me/ktlqztuf95/1
