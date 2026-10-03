---
"rrweb-player": minor
"rrweb": minor
"@rrweb/types": minor
---

Add a top-level annotation event with `record.addAnnotation()` and `replayer.on('annotation', handler)`. Annotation data uses `type: 'caption'` or `type: 'timelineMarker'`. Captions stay visible until replaced or cleared with empty text or false. Hovering or focusing timeline markers reveals their text, and clicking seeks to their timestamp.

Set `showCaptions: true` to display captions by default. Recordings with captions also show a CC toggle. Use `timelineMarkerColor` to configure annotation marker colors separately from custom-event `tags`. Import `annotationData` from `@rrweb/types` to type annotation data.

Make the playback timeline keyboard accessible with five-second arrow-key seeking and Home/End navigation. Give the captions toggle a stable accessible name.
