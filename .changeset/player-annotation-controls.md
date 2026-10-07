---
"rrweb-player": minor
---

Display annotation events as captions and timeline markers. Captions stay visible until replaced or cleared with `text: ''`, `text: null`, or `text: false`. Seeking restores the caption for that replay time. Hovering or focusing timeline markers reveals their text, and clicking seeks to their timestamp.

Captions start hidden; set `showCaptions: true` to display them initially. Recordings with nonempty captions show a CC toggle when the controls are visible. Use `timelineMarkerColor` to configure annotation marker colors separately from custom-event `tags`.
