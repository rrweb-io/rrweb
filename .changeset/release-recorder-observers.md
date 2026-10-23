---
"rrweb": patch
"@rrweb/record": patch
"@rrweb/utils": patch
"rrweb-snapshot": patch
---

Fix record side memory leaks: release observers, mutation buffers and listeners that the recorder no longer needs. Stopping a recording, taking a full snapshot, removing a shadow host, and removing or navigating a same-origin iframe each left mutation buffers registered and observers attached, so memory grew with every stop/start cycle and every checkout, and mutations inside same-origin iframes were recorded once more for every full snapshot taken. Cross-origin iframe message listeners are now also removed when recording stops.

Release iframe shadow observers, scroll listeners and attachShadow patches when their document unloads. Reset shared managers once per recording, and make repeated stop calls harmless. Keep Safari's fallback MutationObserver iframe alive until its last observer stops and acquire a fresh constructor when recording restarts.

Cancel pending iframe and stylesheet loads when recording stops, and replace duplicate load callbacks after full snapshots. Cancel canvas animation loops and terminate their worker on stop. Roll back failed mutation observer setup and leave shadow roots unobserved when DOM recording is disabled.

Release deferred load callbacks when their subtree is removed or their document unloads. Roll back document and recorder setup if a plugin observer fails. Rebind adopted shadow roots to their new document before releasing the old one.

Preserve frozen and locked buffer state during document transfers. Restore iframe shadow patches on failed setup, including delayed startup, and batch removed-subtree load cleanup once per mutation emission.
