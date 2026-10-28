---
"rrweb": patch
"@rrweb/record": patch
---

Replace the single `recordCrossOriginIframes` switch with two origin-scoped options for cross-origin iframe recording:

- `collectFromOrigins: string[]` — set on a parent recorder to accept (and trust) events forwarded up by cross-origin child recorders on those origins. Events from any other origin are dropped. Use `['*']` to accept any origin (insecure).
- `emitToOrigin: string` — set on a cross-origin child recorder to forward its events to its parent, using this value as the `postMessage` target origin so the browser only delivers to a matching parent.

A frame in the middle of a nested chain sets both. `recordCrossOriginIframes` is deprecated but still supported (it behaves as `collectFromOrigins: ['*']` plus forwarding to any parent).
