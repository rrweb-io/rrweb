---
"rrweb": patch
"@rrweb/types": patch
---

Compact style mutation fixes and improvements
 - fixes when style updates contain a 'var()' on a shorthand property #1246
 - further ensures that style mutations are compact by reverting to string method if it is shorter
