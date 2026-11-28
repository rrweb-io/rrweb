---
"rrweb": patch
---

Inactivity skipping now ends exactly on the next interaction, and stops exactly on a stall marker in the gap. It also skips the first gap of a recording, the gap after interactions that share a timestamp, and it is chosen again when an interaction is appended inside the gap or the speed, `maxSpeed`, `skipInactive` or `inactivePeriodThreshold` setting changes. The skip threshold uses the speed set by the user, so the first gap is no longer skipped at any length.
