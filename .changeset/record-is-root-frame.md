---
"rrweb": minor
"@rrweb/record": minor
---

Add `isRootFrame` record option. With `recordCrossOriginIframes` on, a frame is only treated as the emitting root when `window.parent === window`, so rrweb injected into an iframe whose parent doesn't run rrweb emitted nothing and nobody received the events it relayed to its parent. `isRootFrame: true` makes the frame emit its own events while still collecting those of its cross-origin child iframes. Default behaviour is unchanged.
