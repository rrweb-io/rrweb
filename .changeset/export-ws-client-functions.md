---
"@rrwebcloud/js-client": minor
---

Export functions and types to allow named imports. The package now supports both default and named imports:

- `import { start, addMeta, addPageviewMeta, addCustomEvent, getRecordingId } from '@rrwebcloud/js-client'`
- `import { clientConfig, nameValues } from '@rrwebcloud/js-client'` (types)
- `import client from '@rrwebcloud/js-client'` (then use `client.start()`, `client.addMeta()`, etc.)
