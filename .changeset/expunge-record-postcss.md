---
'record': patch
---

Ensure postcss does not get included in the record/dist output files. The postcss bundling problem was present since 2.0.0-alpha.17 where e.g. record/dist/record.js went to 371Kb from 150kB in the previous alpha.15 release.  record.umd.min.cjs had an increase from 73.4kB to 180kB between the alpha 15 and 17 versions.
