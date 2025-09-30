---
"@newrelic/rrweb": patch
---

Loosen observer callback typing to reduce friction integrating custom observers within non‑strict TypeScript projects. Internal observer utilities now accept variadic `(...args: any[])` parameter shapes where rigid function signatures previously produced assignment errors.

No runtime behavior change—only type surface adjustment. Projects desiring stricter guarantees can create local wrapper types around the exported API.
