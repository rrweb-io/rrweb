---
"rrweb": patch
---

Keep the original getter in `hookSetter`. In Firefox extension content scripts (Xray wrappers) `input.value`, `checked` and similar properties read as `undefined` while recording, and stayed that way after `stop()`.
