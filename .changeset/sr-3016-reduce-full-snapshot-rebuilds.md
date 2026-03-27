---
"@amplitude/rrweb": minor
"@amplitude/rrweb-types": patch
---

SR-3016 reduce full-snapshot rebuilds during replay seeking

- Binary search in `discardPriorSnapshots()` and the `play()` event loop (was O(n) linear scan on every seek)
- `SeekCache`: stores serialized DOM snapshots after each seek; subsequent seeks restore from a cached checkpoint instead of replaying from the original `FullSnapshot`
- `playInternal()`: `SeekStart`/`SeekEnd` events now only fire on user-initiated seeks, not internal calls
- New `ReplayerEvents.SeekStart` and `ReplayerEvents.SeekEnd` for UI loading indicators
- New `playerConfig` options: `useSeekCache` (default `false`) and `seekCacheMaxEntries` (default `10`)
