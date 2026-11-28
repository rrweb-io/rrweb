---
"rrweb-player": minor
---

Add opt-in timeline options under `features.timeline`. `compressInactive` makes inactive periods take at most a set share of the timeline's width, while seeking, markers and progress keep recording time. With it on, the compressed scale places the markers, and a paused playhead stays on its moment when earlier events arrive. `seekPreview` shows where a click on the timeline would seek, with the time there unless `time: false`. The timeline is unchanged unless an option is set.
