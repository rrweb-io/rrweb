---
"rrweb-player": minor
"@rrweb/types": minor
---

Add captions and timeline notes through custom events tagged `annotation`. Captions stay visible until the next caption replaces or clears them. Notes appear when hovering or focusing their timeline marker. Clicking the marker seeks to the event's timestamp.

Set `showCaptions: true` to display captions by default. Recordings with captions also show a CC toggle. Import `CustomEventAnnotation` from `@rrweb/types` to type caption and note payloads.
