---
'rrweb': patch
---

We already render a FullSnapshot when the replayer is initialized - also render that same snapshot if user scrubs/seeks back to the beginning (e.g. if replayer is using the first Meta event as t==0)
