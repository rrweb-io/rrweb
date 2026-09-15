---
"rrweb": patch
"@rrweb/record": patch
---

Improvements in efficiency of mutation handling at record time; has been identified as a problem numerous times by @mdellanoce, @JonasBa and others. The new mutation ordering should also result in faster replay performance.
