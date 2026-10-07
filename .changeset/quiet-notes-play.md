---
"rrweb": minor
"@rrweb/types": minor
"@rrweb/record": minor
"@rrweb/replay": minor
---

Add a top-level annotation event with `record.addAnnotation()` and `replayer.on('annotation', handler)`. Annotation data uses `type: 'caption'` or `type: 'timelineMarker'`. Import `annotationData` from `@rrweb/types` to type annotation data. The player can display these annotations as captions and interactive timeline markers.
