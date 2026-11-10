---
"rrweb": minor
"@rrweb/record": minor
---

After an initial mouse movement event (consisting of a single position), subsequent mouse movement events are deliberately batched up and emitted up to 500ms later.
Each mouse movement position in the delayed batch gets a negative timestamp offset representing it's true event time.
This patch causes batching to be interrupted by any other event, including a page mutations, so that the event stream stays strictly sequential even after applying the internal negative offsets; important for live replay and online sequential processing.
