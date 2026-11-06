---
"rrweb": patch
"@rrweb/record": patch
"@rrweb/replay": patch
---

Don't record play/pause/seek etc. against elements that aren't Media Elements and make the player safe (try/catch) against attempts to do so on old recordings.
