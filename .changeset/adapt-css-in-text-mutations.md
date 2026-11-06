---
"rrweb": minor
"@rrweb/replay": minor
---

Add a `adaptCssInTextMutations` player config option (default `true`) so that a consumer which already passes text mutation values through `adaptCssForReplay` can stop the replayer from doing it again. Rewriting is a postcss parse of the whole value, so replaying a stylesheet that is built up over many text mutations otherwise costs one parse of the accumulated CSS per mutation.
