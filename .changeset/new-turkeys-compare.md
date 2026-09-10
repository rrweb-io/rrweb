---
"rrdom": patch
---

In Chrome, calling setAttribute('type', 'text/css') on style elements that already have it causes Chrome to drop CSS rules that were previously added to the stylesheet via insertRule. This fix prevents setAttribute from being called if the attribute already exists.
