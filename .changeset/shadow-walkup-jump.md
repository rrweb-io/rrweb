---
"rrweb": patch
---

fix(record/mutation): extend the drain walk-up through `ShadowRoot` → host so a shadow child whose host is also in `addedSet` never gets dropped from a mutation batch

Follow-up to #1652. The drain's walk-up loop in `MutationBuffer.emit` climbs the parent chain while each parent is in `addedSet`, so a whole subtree gets serialized root-first. For a shadow child the DOM parent is a `ShadowRoot`, which is never put into `addedSet`, so the walk-up exits there. If the shadow host happens to be queued into `addedSet` after the child (which can happen when nested `MutationRecord`s process out of order), the host hasn't been serialized yet when the child is drained, `mirror.getId(host)` returns `-1`, and the child subtree gets dropped via `missingParents`.

This jumps through the `ShadowRoot` to the host inside the walk-up itself, matching how the subsequent `parentId` computation already treats the host as the logical parent for shadow children. No behavior change on any existing test (50/50 integration + 15/15 mutation unit + 28/28 record tests still pass). Bundle size: `rrweb.umd.min.cjs` +24 B (+13 B gzipped).
