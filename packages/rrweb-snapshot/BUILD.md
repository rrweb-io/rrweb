## Note on Tree-shaking postcss

This package contains both snapshot (record-time) and rebuild
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

One part of the solution is to add `"sideEffects": false,` to rrweb-snapshot/package.json
This tells Rollup it is safe for `rebuild.ts` (and therefore `postcss`) to be dropped
when the exports of these files are not consumed, even though they contain
module-level code (such as that `new RegExp(...)`).

The solution for record time bundling (in `packages/record/vite.config.ts`) also needs:

**A custom `resolveId` plugin** that redirects imports of `rrweb`, `rrweb-snapshot`,
and `rrdom` to their original **source** entry points instead of the
pre-built packages. This restores individual module boundaries so Rollup can
see exactly which source files are used and which are not.

Additionally, `packages/rrweb/src/entries/record.ts` was changed from a
default-import-then-re-export pattern to direct named re-exports, which gives
Rollup a clearer view of what is actually used.

A test in `packages/record/test/record.test.ts` asserts that no output bundle
file contains the string "postcss", guarding against future regressions.

## Follow-up refactor (snapshot/rebuild split)

As a low-risk preparation step, `snapshot.ts` and `rebuild.ts` now import
utilities from domain-specific entrypoints (`snapshot-utils.ts` and
`rebuild-utils.ts`) instead of both importing directly from `utils.ts`.

This keeps current public API compatibility while making a future deeper split
of `utils.ts` into snapshot-only, rebuild-only, and truly shared modules more
incremental.
