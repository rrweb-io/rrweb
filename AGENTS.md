# AGENTS.md

This file is for AI coding agents working in this repository. It is
symlinked to `CLAUDE.md` — keep one source of truth rather than maintaining
divergent instruction files.

## Repository Context

This is Grafana's public fork of `rrweb`, a monorepo for recording and
replaying web sessions. It tracks the upstream rrweb ecosystem but contains
Grafana-specific changes that are intentional and must not be removed just
because upstream differs.

Important fork context:

- Remote: `git@github.com:grafana/rrweb.git`.
- Base branch: `main`.
- The original upstream README has been moved to `UPSTREAM_README.md`. The
  root `README.md` is a short internal-fork notice — do not restore upstream
  README content.
- Package metadata still references upstream `rrweb-io/rrweb` in places.
  That is expected.
- Grafana-specific areas include asset event types, sandboxed replay
  hardening, npm override choices, and CI/CD configuration.

## Package Manager

Use npm only.

- Required package manager: `npm@11.12.1` (set via `packageManager` field).
- Do not use `yarn`, `pnpm`, or generate `yarn.lock` / `pnpm-lock.yaml`.
- The root `package-lock.json` is authoritative.
- `.npmrc` sets `legacy-peer-deps=true` for peer dependency compatibility.
- The root `package.json` has a `cssom` override to `rrweb-cssom`. Keep
  this unless a task explicitly changes CSSOM behavior.

## Quick Commands

Install dependencies:

```sh
npm install
```

Build all packages:

```sh
npm run build:all
```

Run all tests:

```sh
npm test
```

Run all type checks:

```sh
npm run check-types
```

Run lint:

```sh
npm run lint
```

Run watch builds for development:

```sh
npm run dev
```

Update TypeScript project references after adding, removing, or renaming
workspaces:

```sh
npm run references:update
```

Format only intended files:

```sh
npx prettier --write <paths>
```

Format files changed from the previous commit:

```sh
npm run format:head
```

Avoid `npm run format` unless broad formatting churn is intended.

## Targeted Commands

Build one package with Turbo:

```sh
npx turbo run prepublish --filter=rrweb-snapshot
```

Run a package test from that package directory:

```sh
cd packages/rrweb-snapshot && npm test
```

Run a focused rrweb browser test:

```sh
cd packages/rrweb && PUPPETEER_HEADLESS=true npx vitest run test/replayer.test.ts -t "sandbox"
```

Run rrweb tests after a package build already exists:

```sh
cd packages/rrweb && PUPPETEER_HEADLESS=true npm run retest
```

Run rrweb tests with a visible browser for debugging:

```sh
cd packages/rrweb && PUPPETEER_HEADLESS=false npm run test:headful
```

Run the recorder REPL:

```sh
cd packages/rrweb && npm run repl
```

Run the local live stream demo:

```sh
cd packages/rrweb && npm run live-stream
```

Build the Chrome extension without inline workers:

```sh
cd packages/web-extension && DISABLE_WORKER_INLINING=true npm run build:chrome
```

## Build System

The monorepo uses npm workspaces:

```json
["packages/*", "packages/plugins/*"]
```

Turbo orchestrates package tasks. The main root tasks are `prepublish`,
`test`, `test:update`, `check-types`, `dev`, and `references:update`.

Scripts use bare tool names (e.g. `turbo run prepublish` not
`npm run turbo ...`) because npm adds `node_modules/.bin` to `PATH`.

Turbo global dependencies include:

- `.eslintrc.js`
- `.prettierrc`
- `vite.config.default.ts`
- `tsconfig.json`

Turbo passes these env vars through to tasks:

- `PUPPETEER_HEADLESS`
- `DISABLE_WORKER_INLINING`

Most packages build through Vite using the shared `vite.config.default.ts`.
Some package Vite configs are `.ts`; older core packages use `.js`.

The shared Vite config:

- Emits ESM and CJS library builds.
- Emits declarations with `vite-plugin-dts`.
- Copies `.d.ts` files to `.d.cts` for CJS export compatibility.
- Generates UMD and minified UMD artifacts via esbuild post-processing.
- Generates bundle analysis HTML files (gitignored).
- Supports `DISABLE_WORKER_INLINING=true` by rewriting `?worker&inline` to
  `?worker`.

## Architecture Overview

Core data flow:

```text
record() -> eventWithTime[] -> optional pack() -> Replayer -> rebuild/diff DOM
```

Primary packages:

| Package | Purpose | Key files |
| --- | --- | --- |
| `@rrweb/types` | Shared event schema and public types | `packages/types/src/index.ts` |
| `@rrweb/utils` | DOM helpers, untainted prototype access | `packages/utils/src/index.ts` |
| `rrweb-snapshot` | DOM serialization and rebuild | `packages/rrweb-snapshot/src/snapshot.ts`, `rebuild.ts` |
| `rrdom` | Virtual DOM and diffing for replay | `packages/rrdom/src/index.ts`, `diff.ts` |
| `rrdom-nodejs` | Node.js DOM polyfill layer for rrdom | `packages/rrdom-nodejs/src/index.ts` |
| `rrweb` | Combined record and replay package | `packages/rrweb/src/index.ts` |
| `@rrweb/record` | Record-only wrapper package | `packages/record/src/index.ts` |
| `@rrweb/replay` | Replay-only wrapper package | `packages/replay/src/index.ts` |
| `@rrweb/packer` | Pack and unpack event payloads | `packages/packer/src/index.ts` |
| `@rrweb/all` | Convenience export of all packages | `packages/all/src/index.ts` |
| `rrweb-player` | Svelte replay UI component | `packages/rrweb-player/src/Player.svelte` |
| `rrvideo` | Playwright-based replay-to-video | `packages/rrvideo/src/index.ts` |
| `@rrweb/web-extension` | Chrome and Firefox extension | `packages/web-extension/src/` |
| plugins | Console, sequential id, canvas WebRTC | `packages/plugins/*/src/index.ts` |

Compatibility alias manifests under `packages/rrweb/rrweb-record`,
`packages/rrweb/rrweb-replay`, `packages/packer/pack`, and
`packages/packer/unpack` point at built files. Treat them as compatibility
shims, not normal source packages.

## Core Entry Points

Recording:

- `packages/rrweb/src/record/index.ts` — main `record()` function
- `packages/rrweb/src/record/observer.ts` — DOM observer setup (~40KB)
- `packages/rrweb/src/record/mutation.ts` — mutation payload processing
- `packages/rrweb/src/record/iframe-manager.ts` — cross-origin iframe
- `packages/rrweb/src/record/shadow-dom-manager.ts` — shadow DOM tracking
- `packages/rrweb/src/record/stylesheet-manager.ts` — CSS change tracking
- `packages/rrweb/src/record/observers/canvas/` — canvas recording

Replay:

- `packages/rrweb/src/replay/index.ts` — `Replayer` class (~77KB)
- `packages/rrweb/src/replay/machine.ts` — xstate FSM for playback state
- `packages/rrweb/src/replay/timer.ts` — animation frame scheduling
- `packages/rrweb/src/replay/media/` — audio/video sync
- `packages/rrweb/src/replay/canvas/` — canvas mutation replay
- `packages/rrweb/src/replay/dialog/` — dialog element handling

Snapshot and rebuild:

- `packages/rrweb-snapshot/src/snapshot.ts` — DOM serialization
- `packages/rrweb-snapshot/src/rebuild.ts` — DOM reconstruction
- `packages/rrweb-snapshot/src/snapshot-utils.ts` — URL handling, masking
- `packages/rrweb-snapshot/src/rebuild-utils.ts` — DOM construction helpers

Prefer the snapshot-specific and rebuild-specific utility entry points for
new internal imports. The broad `rrweb-snapshot/src/utils.ts` export remains
for compatibility.

## Security Model

Read `CONTEXT.md` before changing replay or rebuild behavior.

Use this terminology:

- **Untrusted Replay Data**: serialized rrweb events or snapshots that may
  include attacker-controlled DOM, attributes, URLs, media state, CSS, SVG,
  or event-handler content.
- **Sandboxed Rebuild**: rebuilding into a document owned by an iframe whose
  sandbox policy is exactly `allow-same-origin`, with no `allow-scripts`.
- **Unprotected Rebuild**: rebuilding into a browser document that is not
  protected by the supported sandbox policy.
- **Unsafe Rebuild Opt-Out**: explicit caller permission to allow an
  Unprotected Rebuild.

Hard rules:

- Browser replay of Untrusted Replay Data must use a Sandboxed Rebuild.
- `rrweb-snapshot.rebuild()` is the public security boundary for full
  snapshot reconstruction.
- `rebuild()` rejects top-level browser documents by default.
- `rebuild()` rejects caller-created iframe documents even if they have
  `sandbox="allow-same-origin"`.
- Safe browser rebuilds must use `createSandboxedIframe()` or
  `rebuildIntoSandboxedIframe()`.
- The supported sandbox token set is exactly `allow-same-origin`.
- Any `allow-scripts` replay iframe is an Unprotected Rebuild.
- Passing `UNSAFE_allowUnprotectedRebuild: true` must remain explicit and
  rare.
- `UNSAFE_replayCanvas` is an explicit unsafe path because it adds
  `allow-scripts` to the replay iframe.
- Lower-level node builders such as `buildNodeWithSN()` do not own the
  browser sandbox policy.

Do not weaken tests around:

- Rejection of top-level browser document rebuilds.
- Rejection of caller-created iframe documents.
- Rejection of sandbox policies other than exactly `allow-same-origin`.
- `UNSAFE_replayCanvas` using `allow-same-origin allow-scripts`.
- `Replayer` passing `UNSAFE_allowUnprotectedRebuild` only for the unsafe
  canvas path.

Relevant files:

- `CONTEXT.md`
- `docs/sandbox.md`
- `docs/adr/0001-require-sandboxed-browser-rebuilds.md`
- `packages/rrweb-snapshot/src/rebuild.ts`
- `packages/rrweb-snapshot/test/rebuild.test.ts`
- `packages/rrweb/src/replay/index.ts`
- `packages/rrweb/test/replayer.test.ts`

## Event Schema

The serialized event contract lives in `@rrweb/types`.

Important types and enums:

- `EventType`
- `IncrementalSource`
- `eventWithTime`
- `eventWithoutTime`
- `assetEvent`
- `assetEventWithTime`
- `assetParam`
- `RecordPlugin`
- `ReplayerEvents`

Grafana added asset event types. `EventType.Asset` and the asset type aliases
are public API. If event schema changes, update all affected record, replay,
packer, docs, and tests together.

Deprecated but still supported record options:

- `inlineStylesheet`
- `inlineImages`

Do not remove deprecated behavior unless the task explicitly asks for a
breaking change. Future asset capture work should build on the asset event
types.

## Recorder Notes

Recorder behavior is privacy-sensitive.

Preserve defaults unless a task explicitly changes them:

- `blockClass = "rr-block"`
- `ignoreClass = "rr-ignore"`
- `maskTextClass = "rr-mask"`
- Password inputs are masked by default.
- `inlineStylesheet = true`
- `inlineImages = false`
- `recordAfter = "load"` unless `DOMContentLoaded` is requested.

Observer setup must return cleanup handlers. Be careful to unregister hooks,
event listeners, plugin observers, and error handlers.

Cross-origin iframe recording uses postMessage and origin metadata. Avoid
broad changes to iframe message handling without targeted tests.

Use `@rrweb/utils` helpers when DOM prototypes may be patched by frameworks.
The utilities provide untainted accessors and methods for DOM APIs.

## Replayer Notes

`Replayer` owns:

- Replay iframe creation.
- The player state machine (`@xstate/fsm`).
- Timer scheduling.
- Virtual DOM optimization.
- Media synchronization.
- Canvas replay gating.
- Plugin build and event hooks.

Replay uses `rrdom` for virtual DOM optimized seeking. When
`usingVirtualDom` is active, mutations are applied to virtual nodes and
later flushed to the real DOM via `diff()`.

Canvas replay is gated by `UNSAFE_replayCanvas`. Do not apply canvas
mutation data when this option is false.

Injected replay styles are not part of the recorded page. Do not serialize
them or assign normal serialized node ids to them. rrdom uses negative ids
for unserialized replay-only nodes.

## Snapshot and Rebuild Notes

Snapshot responsibilities:

- Serializing DOM nodes with stable ids via Mirror.
- Masking and blocking sensitive content.
- Turning script tags into `noscript`.
- Absolutifying URLs in attributes and stylesheets.
- Capturing input, media, canvas, stylesheet, iframe, and shadow DOM state.

Rebuild responsibilities:

- Reconstructing serialized nodes into live DOM.
- Preserving mirror id mappings.
- Adapting CSS for replay (`:hover` → class-based, device media queries).
- Enforcing the browser rebuild target guard.

CSS replay uses PostCSS helpers. Keep behavior covered by
`packages/rrweb-snapshot/test/css.test.ts` and rebuild tests.

## rrdom Notes

`rrdom` implements the virtual DOM representation and diffing used by replay
for seeking performance.

Important concepts:

- `RRDocument` owns a mirror.
- `RRIFrameElement` owns a nested `RRDocument`.
- `RRCanvasElement` stores replay canvas data without being a real canvas.
- `RRStyleElement` stores stylesheet mutation records.
- Unserialized replay-only nodes use negative ids.

When changing rrdom, run both rrdom tests and rrweb replay tests because
replay depends on rrdom behavior.

## Plugin Notes

Plugin packages live under `packages/plugins`.

Current plugin pairs:

- Console record and replay.
- Sequential id record and replay.
- Canvas WebRTC record and replay.

Record plugins can provide observers and event processors. Replay plugins
can handle events, observe built nodes, and access the replay mirror.

Keep plugin payload types compatible between record and replay packages.

## Web Extension Notes

The web extension uses Vite, React, `vite-plugin-web-extension`, and
browser-specific build scripts.

Chrome Web Store builds must avoid base64 inline workers. Use
`DISABLE_WORKER_INLINING=true` for Chrome extension builds.

Do not assume extension builds share the same library-mode Vite config as
the other packages.

## rrweb-player Notes

`rrweb-player` is Svelte 4-based.

The Vite config generates `.svelte.d.ts` files and copies them into `src`.
The `.svelte-kit` generated files are ignored. Avoid manually editing
generated SvelteKit output.

The player wraps `Replayer` from `@rrweb/replay` and exposes a compatibility
constructor that accepts `data` as an alias for `props`.

## Testing Guidance

Root `npm test` runs Turbo tests with concurrency 1 and continues after
failures. Use root tests for broad validation and package tests for focused
work.

Vitest config uses `pool: "forks"` for Vite 6 compatibility.

Puppeteer tests use `PUPPETEER_HEADLESS`:

- `PUPPETEER_HEADLESS=true` for normal headless runs.
- `PUPPETEER_HEADLESS=false` for visible browser debugging.

Several package tests require built artifacts. For `rrweb`, `npm test`
builds first; `npm run retest` runs Vitest after a build already exists.

Snapshot updates:

```sh
npm run test:update
```

Only update snapshots when output changes are intentional. Inspect diffs
carefully.

`rrvideo` uses Jest and Playwright rather than Vitest.

## TypeScript and Linting

The base TypeScript config (`tsconfig.base.json`) is strict:

- `strict`
- `noImplicitAny`
- `strictNullChecks`
- `noUnusedLocals`
- `noUnusedParameters`
- `isolatedModules`
- `verbatimModuleSyntax`

Known package exceptions:

- `packages/rrweb/tsconfig.json` sets `strict: false`.
- `packages/plugins/rrweb-plugin-console-record/tsconfig.json` sets
  `strict: false`.

Do not use those exceptions as a reason to add loose new code. Keep new code
typed.

Because `verbatimModuleSyntax` is enabled, use type-only imports where
appropriate:

```ts
import type { eventWithTime } from '@rrweb/types';
```

ESLint uses type-aware `@typescript-eslint`, `eslint-plugin-compat`,
`eslint-plugin-jest`, and TSDoc warnings.

Camelcase is enforced with these allowed patterns:

- `rr_.*`
- `legacy_.*`
- `UNSAFE_.*`
- `__rrweb_.*`

Do not rename serialized fields, compatibility fields, or explicit unsafe
options just to satisfy camelcase preferences.

## Formatting and Style

Prettier config uses `trailingComma: "all"`.

General style:

- End files with a newline.
- Use `const` and `let`, not `var`.
- Prefer arrow functions for callbacks.
- Prefer template literals over string concatenation.
- Use a plain `return` at the end of a function when returning nothing.
- For new files, use hyphenated file names (e.g. `iframe-manager.ts`).
- Keep comments concise.

Markdown should follow the existing documentation style. The lint command
only markdown-lints `docs/`.

## Browser Compatibility

The root `browserslist` is:

```json
["defaults", "not op_mini all"]
```

`eslint-plugin-compat` checks package source. When adding browser APIs,
consider compatibility or use guarded feature detection.

## CI/CD

GitHub Actions workflows:

- **Dependency review** (`.github/workflows/dependency-review.yml`): runs on
  PRs and merge groups. Checks that new dependencies use Apache-2.0-
  compatible licenses (MIT, ISC, BSD-2/3-Clause, 0BSD, BlueOak, Unlicense,
  CC0, CC-BY-4.0, Artistic-2.0). Actions are pinned by SHA.

Renovate (`.github/renovate.json`) handles automated dependency updates:

- Schedule: Monday, Wednesday, Friday before 5am UTC.
- Groups npm dependencies, GitHub Actions dependencies, and patch updates.
- 7-day minimum release age for supply chain protection.
- OSV vulnerability alerts enabled with priority labeling.

PR titles are linted by CI and must follow conventional commit format
(e.g. `feat: add X`, `fix: resolve Y`, `chore: update Z`).

Do not reintroduce upstream GitHub Actions workflows unless specifically
asked. The fork maintains its own CI configuration. Keep any new workflow
actions pinned by SHA.

## Releases

This repo uses release-please for versioning and releases.

Configuration files:

- `release-please-config.json` — monorepo release configuration.
- `.release-please-manifest.json` — tracks the current version.

Key details:

- All 19 packages are versioned in lockstep via the `extra-files` mechanism
  in the release-please config.
- Currently in alpha prerelease mode (`2.0.0-alpha.x`).
- Release-please automatically creates release PRs with changelogs when
  conventional commits land on `main`.
- Do not manually edit `.release-please-manifest.json`.
- Do not manually bump version numbers in individual `package.json` files —
  release-please manages all of them.
- Do not add Changesets or restore the old Changesets release flow.
- When adding, removing, or renaming packages, update the npm workspace
  list, release-please `extra-files`, and the manifest together.

When making changes that warrant a version bump, use conventional commit
messages (e.g. `feat:`, `fix:`, `chore:`) so release-please can generate
appropriate changelogs and version bumps.

## Common Pitfalls

- Do not use yarn or pnpm.
- Do not remove the root `cssom` override to `rrweb-cssom`. It affects
  `rrdom-nodejs` CSS parsing.
- Do not reintroduce upstream GitHub Actions workflows unless requested.
- Do not weaken sandbox checks to make tests pass. The strict browser
  rebuild guard is intentional.
- Do not treat `UNSAFE_replayCanvas` as a normal replay option. It opts out
  of script-execution protection.
- Do not rebuild Untrusted Replay Data into `document` or a caller-created
  iframe without an explicit unsafe opt-out.
- Do not serialize replay-only injected style nodes.
- Do not change event enum ordering. Serialized numeric enum values are part
  of the replay wire contract.
- Do not forget CSS exports for replay packages. `rrweb`, `@rrweb/replay`,
  and `rrweb-player` expose CSS artifacts.
- Do not assume every package has a `.ts` Vite config. Some core packages
  use `vite.config.js`.
- Do not assume all tests are Vitest. `rrvideo` uses Jest.
- Do not restore upstream README content into `README.md`. The original
  lives in `UPSTREAM_README.md`.
- Do not manually edit version numbers. Release-please manages versions
  across all packages.
- Do not remove `.npmrc` or its `legacy-peer-deps=true` setting unless the
  task explicitly changes dependency resolution.
- Do not add dependencies with licenses incompatible with the dependency
  review allowlist. The CI will block the PR.

## When Changing Public APIs

Update all relevant places:

- Types in `packages/types/src/index.ts`.
- Record emitters or options in `packages/rrweb/src/record/`.
- Replay handling in `packages/rrweb/src/replay/`.
- Snapshot or rebuild types if serialized DOM changes.
- Packer if event wire format changes.
- Wrapper packages (`@rrweb/record`, `@rrweb/replay`, `@rrweb/all`) if
  exports change.
- Docs in `guide.md`, package READMEs, or `docs/`.
- Tests and snapshots.

Use conventional commit messages so release-please picks up the change.

## Before Finishing a Task

Run the narrowest meaningful checks first. For cross-package or public
behavior changes, also run root checks.

Typical final validation for core changes:

```sh
npm run check-types
npm run lint
npm test
```

For security-sensitive replay or rebuild changes, also run:

```sh
cd packages/rrweb-snapshot && npm test
cd packages/rrweb && PUPPETEER_HEADLESS=true npx vitest run test/replayer.test.ts
```

Report which commands ran and any commands that could not be run.

## Maintaining This File

This file must stay accurate as the codebase evolves. When making changes
that affect what is documented here, update this file in the same commit.

Changes that require an update to this file include:

- Adding, removing, or renaming packages or workspaces.
- Changing the build system, test framework, or tooling.
- Adding new event types or modifying the event schema.
- Changing security boundaries or sandbox behavior.
- Modifying the package manager, dependency overrides, or workspace
  structure.
- Adding new conventions, naming patterns, or lint rules.
- Changing CI/CD, release process, or workflow configuration.
- Adding new entry points or significantly restructuring source directories.

If you are an AI agent and you notice this file is out of date with respect
to the current state of the repository, flag it to the user and propose the
specific updates needed.
