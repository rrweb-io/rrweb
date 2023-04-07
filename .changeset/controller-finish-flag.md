---
"rrweb-player": patch
"rrweb": patch
---

Reset the finished flag in Controller `goto` instead of `handleProgressClick` so that it is properly handled if `goto` is called directly.
