---
'rrdom': major
'rrdom-nodejs': major
'rrweb': patch
---

Refactor: Improve performance by 80% in a super large benchmark case.

1. Refactor: change the data structure of childNodes from array to linked list
2. Improve the performance of the "contains" function. New algorithm will reduce the complexity from O(n) to O(logn)
