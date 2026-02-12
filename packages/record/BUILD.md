## Note on Tree-shaking postcss

The `rrweb-snapshot` package contains both snapshot (record-time) and rebuild
(replay-time) code. The rebuild module imports `postcss`, a large dependency
that is only needed during replay. Because `rrweb-snapshot` re-exports
everything from a single `index.ts` barrel file, bundlers that consume the
pre-built package see it as one indivisible chunk — they cannot tree-shake out
`rebuild.ts` and its `postcss` import, even when only snapshot functions are
used.

We initially tried adding `/*#__PURE__*/` annotations to side-effecting
expressions (e.g. `new RegExp(...)`) inside `rrweb-snapshot/src/css.ts`, hoping
Rollup would then drop the unused modules. This did not work because by the
time this package imports from the published `rrweb-snapshot` package, the
sources have already been bundled together — the individual module boundaries
that Rollup needs for tree-shaking no longer exist.

The solution (in `vite.config.ts`) uses two techniques:

1. **A custom `resolveId` plugin** redirects imports of `rrweb`, `rrweb-snapshot`,
   and `rrdom` to their original **source** entry points instead of the
   pre-built packages. This restores individual module boundaries so Rollup can
   see exactly which source files are used and which are not.

2. **`treeshake.moduleSideEffects: false`** tells Rollup it is safe to drop
   any module whose exports are not consumed, even if that module contains
   top-level code. This allows `rebuild.ts` (and therefore `postcss`) to be
   eliminated entirely from the record bundle.

Additionally, `packages/rrweb/src/entries/record.ts` was changed from a
default-import-then-re-export pattern to direct named re-exports, which gives
Rollup a clearer view of what is actually used.

A test in `packages/record/test/record.test.ts` asserts that no output bundle
file contains the string "postcss", guarding against future regressions.
