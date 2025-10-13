---
"@newrelic/rrweb": minor
---

Deprecate legacy streaming script / live streaming helper.

The previously bundled streaming script is now deprecated and slated for removal in a future major. Recommended alternative:

Implement a custom transport layer that buffers `record()` emitted events (full + incremental snapshots) and forwards them over your preferred channel (e.g. WebSocket, SSE, or batched HTTP). Replay continuity is unaffected—`Replayer` accepts the same event array.

No runtime code was removed in this change; this update surfaces the deprecation for downstream consumers so they can plan migration.
