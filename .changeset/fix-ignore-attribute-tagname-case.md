---
"rrweb-snapshot": patch
"rrweb": patch
---

Lowercase the tag name in `ignoreAttribute` so `autoplay` mutations on `<video>`/`<audio>` are ignored on the attribute-mutation path, which passes the native uppercase `target.tagName`
