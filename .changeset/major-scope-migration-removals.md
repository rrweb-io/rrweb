---
"@newrelic/rrweb": major
"@newrelic/rrweb-record": major
"@newrelic/rrweb-replay": major
"@newrelic/rrweb-player": major
"@newrelic/rrweb-snapshot": major
"@newrelic/rrweb-types": major
"@newrelic/rrweb-utils": major
"@newrelic/rrweb-packer": major
"@newrelic/rrdom": major
"@newrelic/rrvideo": major
"@newrelic/rrweb-all": major
---

Monorepo scope migration and package removals.

Breaking changes / Migration notes:

1. Package scope rename: All previously consumed packages (e.g. `rrweb`, `@rrweb/replay`, `@rrweb/types`, `rrdom`, etc.) are now published under the `@newrelic` scope. Update imports:
   - `import { record } from 'rrweb'` -> `import { record } from '@newrelic/rrweb'`
   - `import { Replayer } from '@rrweb/replay'` -> `import { Replayer } from '@newrelic/rrweb-replay'`
   - `import type { eventWithTime } from '@rrweb/types'` -> `import type { eventWithTime } from '@newrelic/rrweb-types'`

2. Removed packages:
   - `rrdom-nodejs` has been removed. (If you relied on server-side DOM utilities, migrate to a custom integration invoking the core serialization or a maintained fork.)
   - Legacy plugin packages (console, canvas-webrtc, sequential-id) & the web-extension have been removed from this distribution. Their functionality should be reimplemented via direct observer extensions or kept in external forks.

3. Distributed artifact filename normalization: All dist bundles now follow the pattern `<package-name>.js / .cjs / .umd.cjs` (ESM, CJS, UMD). If you previously deep‑linked into paths like `rrweb/dist/rrweb.umd.min.js` or `rrdom/es/...`, switch to the package root entry points instead.

4. Style assets: Replay and player CSS remain available at `@newrelic/rrweb-replay/dist/style.css` and `@newrelic/rrweb-player/dist/style.css` respectively.

5. Deprecation: The legacy streaming script / live streaming helper is deprecated and will be removed in a later major. Consider a custom transport layer around emitted events instead.

6. Observer callback typing was loosened intentionally (non‑strict monorepo) to reduce friction. If you require stronger typing, wrap the exposed API in your application with stricter function signatures.

Action checklist for upgraders:
- Replace every unscoped or `@rrweb/*` import with the new `@newrelic/` scoped name.
- Remove any direct references to deleted plugin or extension packages.
- Stop deep-linking into internal build folders; use root module specifiers.
- Validate build tooling (Vite/Webpack/Rollup) resolves the new scoped packages without custom path aliases.
