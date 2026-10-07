---
"rrweb-player": minor
"rrweb": minor
"@rrweb/types": minor
"@rrweb/browser-client": minor
---

Add a top-level annotation event with `record.addAnnotation()` and `replayer.on('annotation', handler)`. Annotation data uses `type: 'caption'` or `type: 'timelineMarker'`. Captions stay visible until replaced or cleared with empty text or false. Hovering or focusing timeline markers reveals their text, and clicking seeks to their timestamp.

Set `showCaptions: true` to display captions by default. Recordings with captions also show a CC toggle. Use `timelineMarkerColor` to configure annotation marker colors separately from custom-event `tags`. Import `annotationData` from `@rrweb/types` to type annotation data.

Make the playback timeline keyboard accessible with Home/End navigation. Give the captions toggle a stable accessible name.

`@rrweb/browser-client` also exports `addAnnotation()`, which records annotations immediately during an active session or queues them with a timestamp until recording starts.
