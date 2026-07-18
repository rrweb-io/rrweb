---
'rrweb': patch
'@rrweb/replay': patch
---

Make replay slightly more robust against bad mutations - replace a prior try/catch from #620 which didn't work against rrdom, and also cover appendChild failures
