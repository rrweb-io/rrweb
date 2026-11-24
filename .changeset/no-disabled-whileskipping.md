---
"rrweb": patch
"@rrweb/replay": patch
"@rrweb/rrweb-player": patch
---

Ensure `play()` (and `replayer.pause()`) reverts any ongoing fast-forward/skip-inactivity so 'Skip inactivity' can be used in rrweb-player without disabling controls
