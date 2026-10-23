# Record Tree-Shaking Design

## Context

`rrweb-snapshot` contains both record-time snapshot code and replay-time rebuild code. The rebuild path imports `postcss`, which is large and unnecessary for `@rrweb/record` consumers. Because `rrweb-snapshot` currently publishes a single barrel bundle, consumers that import record-only APIs can still end up with replay-only code in their output.

The goal is to reimplement the behavior targeted by rrweb PR #1784 without copying that implementation. The implementation should use the current repository structure and keep the change low risk.

## Goals

- Build `@rrweb/record` without bundling `postcss`.
- Preserve the current public API for `rrweb`, `rrweb-snapshot`, `rrdom`, and `@rrweb/record`.
- Keep the implementation narrow and easy to review.
- Add tests that catch both the direct dependency regression and the bundle-size impact.

## Non-Goals

- Do not add new public `rrweb-snapshot` subpath exports.
- Do not split `rrweb-snapshot` into separate published snapshot and rebuild packages.
- Do not refactor snapshot/rebuild utilities unless the narrow build fix cannot pass verification without it.
- Do not inspect or copy the PR #1784 implementation.

## Proposed Approach

Use a source-boundary build fix for `packages/record`.

1. Mark `rrweb-snapshot` as side-effect-free in `packages/rrweb-snapshot/package.json`.
2. Add a Vite/Rollup `resolveId` plugin to `packages/record/vite.config.ts`.
3. During the record package build, redirect bare imports of `rrweb`, `rrweb-snapshot`, and `rrdom` to their local source entry files instead of their pre-built package entrypoints.
4. Change `packages/rrweb/src/entries/record.ts` to directly re-export the named `record` export from the record module.
5. Extend `packages/record/test/record.test.ts` so it verifies the built record output does not contain `postcss` and records a significant file-size drop signal.

## Architecture

The public packages keep their existing import paths. The special behavior is limited to the `@rrweb/record` build config.

The record package currently imports `record` through `rrweb`. That package import can resolve to the pre-built `rrweb` bundle, which hides source module boundaries from Rollup. The custom resolver restores those boundaries by mapping:

- `rrweb` to `packages/rrweb/src/entries/record.ts`
- `rrweb-snapshot` to `packages/rrweb-snapshot/src/index.ts`
- `rrdom` to `packages/rrdom/src/index.ts`

The resolver should match only exact bare imports. It should not rewrite subpath imports such as `rrweb/foo` unless a future change explicitly adds that case.

The resolver should live inline in `packages/record/vite.config.ts`. It is a record-package build concern, not a shared monorepo helper.

Once Rollup sees source modules, `"sideEffects": false` on `rrweb-snapshot` allows unused rebuild modules to be removed when record consumers do not use rebuild exports. This should use plain `"sideEffects": false`, not a narrower allowlist. PR #1834's `rebuild.ts` changes do not add import-time side effects; its DOM work and sandbox checks happen only when exported functions are called.

The `rrweb` record entry should use a direct named re-export. This gives Rollup a simpler export graph than a default import followed by a re-export.

## Testing

Keep the existing smoke test that `record` is a function.

Add a build-output regression test for `@rrweb/record`:

- Inspect emitted `.js` and `.cjs` files in `packages/record/dist`.
- Assert no emitted `.js` or `.cjs` file contains the string `postcss`.
- Use `packages/record/dist/record.js` as the canonical size signal.
- Measure the current `dist/record.js` size locally before changing implementation files, then assert the fixed `dist/record.js` size is at least 200KB smaller than that baseline.

The implementation should encode that baseline-derived threshold as a constant in the test, with a comment documenting the measured before/after sizes. The test should compare durable built artifacts, not transient visualizer output or source maps. It should not run the build itself; if `dist/record.js` is missing, it should fail with a clear message telling the developer to run `yarn workspace @rrweb/record build` first.

## Verification

Run focused verification after implementation:

```sh
yarn workspace rrweb-snapshot check-types
yarn workspace @rrweb/record build
yarn workspace @rrweb/record test
```

## Risks

The resolver must be scoped to the record build. Applying it globally could change other package builds unexpectedly.

The file-size threshold must be strict enough to catch regressions but not so strict that unrelated output formatting or dependency updates cause noise. It should focus on the main JavaScript bundle and leave source maps out of the assertion.

Marking `rrweb-snapshot` as side-effect-free assumes its module-level code does not intentionally perform observable side effects on import. That matches the intended package usage for tree-shaking and remains compatible with PR #1834's `rebuild.ts` changes, but verification should include existing snapshot and record tests.
