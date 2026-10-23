---
"rrweb-snapshot": patch
---

fix: release removed shadow trees from the mirror

Removing a shadow host left its shadow descendants in the mirror's strong-reference map, so repeatedly replacing web components retained their detached trees. Recurse into shadow roots during removal, including nested hosts, while preserving weak metadata so reinserted nodes retain their IDs.
