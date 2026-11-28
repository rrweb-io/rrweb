---
"rrweb": patch
---

Record WebGPU canvases when `sampling.canvas` is set: take the snapshot after the page has drawn the frame, instead of capturing an expired (transparent) texture that was silently dropped
