# Use a record-local source-boundary resolver

`@rrweb/record` needs to build without replay-only `rrweb-snapshot` code such as `postcss`, but adding public snapshot/rebuild subpath exports would expand the package API and create compatibility obligations. We will keep the public package API unchanged and add a resolver scoped to the `@rrweb/record` build that maps selected bare package imports to local source entrypoints, restoring Rollup's module visibility for tree-shaking.
