---
"rrweb-player": minor
---

Display annotation events as captions and timeline markers. Captions stay visible until replaced or cleared with `text: ''`, `text: null`, or `text: false`. Seeking restores the caption for that replay time. Hovering or focusing timeline markers reveals their text, and clicking seeks to their timestamp.

Captions are shown by default; set `showCaptions: false` to hide them initially. Recordings with nonempty captions show a CC toggle when the controls are visible. Use `timelineMarkerColor` to configure annotation marker colors separately from custom-event `tags`.
