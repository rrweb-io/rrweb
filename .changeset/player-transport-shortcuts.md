---
"rrweb-player": minor
---

Add opt-in jump buttons and keyboard shortcuts (`features.jump`): arrows jump and Space plays or pauses, `player.jump()` and a `ui-jump` event. Two new props, both off by default: `clickToPlay` plays or pauses the replay on a click, and `showPlayOverlay` shows a play button over a paused replay on hover. `addEventListener` now returns a function that removes the listener. Nothing changes unless a feature is turned on.
