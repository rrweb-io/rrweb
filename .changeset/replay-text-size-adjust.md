---
"rrweb": patch
---

Stop phone browsers from enlarging the text of a replay. Mobile browsers enlarge text in pages they consider too small to read, which pushed the text of a scaled-down replay out of its recorded layout. The Replayer's injected styles now set `text-size-adjust: 100%` on the replayed page. A recorded page that sets `text-size-adjust` in an ordinary `html` rule keeps its own value; one set inside a CSS cascade layer is overridden. A recording made on a phone whose browser enlarged the text replays without that enlargement, since it was never part of the recording.
