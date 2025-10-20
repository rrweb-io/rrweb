---
'rrweb': patch
---

Fix: some websites rebuild imcomplete

1. Some websites, addedSet in emit function is not empty, but the result converted from Array.from is empty.
2. Some websites polyfill classList functions of HTML elements. Their implementation may throw errors and cause the snapshot to fail. I add try-catch statements to make the code robust.
