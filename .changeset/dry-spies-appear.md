---
"@newrelic/rrweb-snapshot": patch
---

Update rrweb handling of inlining images. 
Patch image inlining so that images are unaltered in the DOM and prevents images from breaking when server doesn't support CORS.
Reset tainted canvas after encountering a CORS error to prevent subsequent fixable images from being un-inlined.
