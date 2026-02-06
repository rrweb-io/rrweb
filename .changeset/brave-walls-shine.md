---
'@rrweb/record': major
'@rrweb/replay': major
---

BREAKING CHANGE: Rename UMD global names from `rrweb` to `rrwebRecord` for the recorder and `rrwebReplay` for the replayer. This avoids conflicts when both are loaded on the same page.
