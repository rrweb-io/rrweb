# Internal Design

Technical design documents explaining how rrweb was originally designed and how it works under the hood.

- [Serialization](../serialization.md) — how rrweb captures a full DOM snapshot, including cross-origin iframes, canvas, and media elements.
- [Incremental Snapshots](../observer.md) — how mutations, input events, scroll, and other incremental changes are recorded after the initial snapshot.
- [Replay](../replay.md) — how recorded events are replayed with high-precision timing and minimal impact on the host page.
- [Sandbox](../sandbox.md) — how the replayer uses iframe sandboxing to safely replay pages without executing their scripts.
