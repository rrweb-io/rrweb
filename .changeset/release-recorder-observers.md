---
"rrweb": patch
"@rrweb/record": patch
"@rrweb/utils": patch
---

Fix record-side memory leaks and duplicate mutation emission:

- Stopping a recording now releases the root document's mutation buffer and observer — previously the document observer was only disconnected, so each start/stop cycle leaked one buffer — and removes the cross-origin iframe `message` listener.
- A same-origin iframe is observed once instead of re-observed on every full snapshot (`checkoutEveryNth`/`checkoutEveryNms`/manual `takeFullSnapshot`), so a single iframe mutation is no longer emitted once per checkout; its observers are also released when the iframe is removed or navigates away.
- The untainted-`MutationObserver` helper iframe used on WebKit/Safari is reference-counted, so it is torn down only when the last observer stops and will get rebuilt for a later recording.
