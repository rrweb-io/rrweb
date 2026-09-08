---
"rrweb-snapshot": patch
---

Omit the `srcdoc` attribute when rebuilding iframe elements, so the browser doesn't race its own async document load against rrweb's own reconstruction of the iframe's contents (which could desync the mirror and throw `insertBefore` errors)
