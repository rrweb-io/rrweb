# Use a record-local source-boundary resolver

`@rrweb/record` needs to build without replay-only `rrweb-snapshot` code such as `postcss`, but adding public snapshot/rebuild subpath exports would expand the package API and create compatibility obligations. We will keep the public package API unchanged and add a resolver scoped to the `@rrweb/record` build that maps selected bare package imports to local source entrypoints, restoring Rollup's module visibility for tree-shaking.

## Follow-up Refactor

`rrweb-snapshot` now has internal snapshot-domain and rebuild-domain utility entrypoints. These entrypoints currently re-export from the legacy shared `utils.ts` module, preserving public API compatibility while making a future split of snapshot-only, rebuild-only, and shared helpers incremental.
