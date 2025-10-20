---
"@newrelic/rrweb-packer": patch
"@newrelic/rrweb-replay": patch
---

Ensure stability of packer subpath exports (`@newrelic/rrweb-packer/pack` & `/unpack`) and retain explicit replay stylesheet distribution at `@newrelic/rrweb-replay/dist/style.css`.

Changes:

- Verified and documented subpath exports to prevent future regressions.
- Copied/retained replay `style.css` asset and updated internal imports.

No action required unless you previously deep‑linked into internal, non‑exported packer paths.
