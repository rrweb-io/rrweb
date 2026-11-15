---
"rrweb": minor
---

Two opt-in replayer options, both off by default:

- `smoothCursor`: the cursor is interpolated between recorded mouse samples instead of jumping from one to the next. Samples closer than 250ms are joined with a Catmull-Rom spline; across longer gaps the cursor holds still and moves during the last 140ms before the next sample. The cursor halo shrinks as the cursor speeds up, and the mouse trail is drawn along the interpolated path, tapering to nothing at its tail.
- `smoothScroll`: scroll samples on the same target less than 400ms apart are interpolated frame by frame, and recorded scroll positions are re-applied every 200ms while they differ from the actual position, which fixes scrolls that were clamped before images and fonts had loaded.
