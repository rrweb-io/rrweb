---
'rrweb-snapshot': patch
---

Fix: CSS transitions are incorrectly being applied upon rebuild in Firefox. Presumably FF doesn't finished parsing the styles in time, and applies e.g. a default margin:0 to elements which have a non-zero margin set in CSS, along with a transition on them.

Related bug report to Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1816672​
