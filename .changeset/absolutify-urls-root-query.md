---
"rrweb-snapshot": patch
---

`absolutifyURLs`: a `..` at the root no longer drops the host (`url(../a.woff2)` in `https://example.com/style.css` now gives `https://example.com/a.woff2`), and a `/` in the query of the base URL is no longer read as a path segment
