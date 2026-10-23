---
"rrvideo": minor
---

Advance FFmpeg captures with one-pass controlled playback, add optional Linux/Windows compositor capture, and bound encoder failures and backpressure. Include a same-host benchmark against per-frame seeking.

Recover missing compositor images with bounded, increasing drawing timestamps, reject unsupported compositor frame rates, and fail captures when the controlled replay loop throws while keeping unavailable media non-fatal. Add real-Chrome retry, idle-frame, and encoded-pixel timing regression coverage.
