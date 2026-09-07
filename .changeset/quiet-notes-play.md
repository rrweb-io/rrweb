---
"rrweb-player": minor
"@rrweb/types": minor
---

Add independent hover notes and optional captions for custom events tagged annotation. Caption payloads use kind: 'caption' with set (the default action) or clear, so recorded timestamps determine their duration. Notes use kind: 'note'. Captions follow pauses, seeks, and speed changes and can be toggled with CC. Notes support keyboard focus and precise seeking. Refresh annotations when events are added to the player.

Export the shared CustomEventAnnotation payload type from @rrweb/types for recording authors, and re-export it from rrweb-player.
