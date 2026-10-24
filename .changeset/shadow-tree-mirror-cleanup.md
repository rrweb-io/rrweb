---
"rrweb-snapshot": patch
"@rrweb/record": patch
---

fix: release removed shadow trees from the mirror

Removing a shadow host from DOM was leaving references to shadow descendants, so e.g. repeatedly replacing web components mem-leaked their detached trees. Fix by recursing into shadow roots during removal, including nested hosts and releasing strong references from the mirror.
