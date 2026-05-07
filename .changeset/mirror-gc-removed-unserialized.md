---
"@amplitude/rrweb": patch
---

fix(record): prevent `Mirror.idNodeMap` leak when removed nodes have no mirror id. Serialized descendants of removed-but-unserialized nodes are now correctly evicted via `mapRemoves`.
