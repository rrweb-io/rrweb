---
"rrweb-snapshot": major
"rrweb": patch
---

Require browser `rebuild()` calls to target a document created by `rebuildIntoSandboxedIframe()` or `createSandboxedIframe()` by default. Use these helpers for untrusted replay data, or pass `unsafeAllowUnprotectedRebuild: true` only when accepting the script-execution risk.

`rrweb` now marks `UNSAFE_replayCanvas` rebuilds as an explicit unsafe path because canvas replay adds script permission to the replay iframe.
