# Copilot Instructions for rrweb Monorepo

Goal: Enable AI agents to quickly implement or modify features in rrweb (record & replay web sessions) with correct architecture, patterns, and build workflows. Keep changes minimal, type-safe, and performance‑aware.

## 1. Monorepo Structure & Roles

Packages live under `packages/*`:

- `rrweb` (core): orchestrates recording (`src/record`) & replay (`src/replay`). Exposes `record()` and `Replayer` plus plugin hooks.
- `rrweb-snapshot`: DOM serialization (snapshot & incremental mutation semantics). Avoid duplicating logic here—reuse exported helpers (`snapshot`, `createMirror`).
- `rrdom`: Virtual DOM & diff utilities used in replay fast‑forward optimizations.
- `@rrweb/record` & `@rrweb/replay`: Thin entry wrappers re-exporting core pieces for modular consumption.
- `@rrweb/types`: Shared type contracts (event schema, plugin interfaces, `IncrementalSource`, etc.). Always import types from here instead of redefining.
- `@rrweb/utils`: Shared utilities (patching, DOM helpers) used by plugins & core.
- `@rrweb/packer`: Compression / packing logic (`pack`, `unpack`) for event streams.
- `rrweb-player`: UI layer (Svelte) wrapping `Replayer`.
- `plugins/*`: Optional record/replay plugins (e.g., console, canvas, sequential-id). Use these as canonical examples for new plugins.

## 2. Event Model (Critical)

Two fundamental event categories:

1. Full snapshot: Complete serialized DOM (`EventType.FullSnapshot`).
2. Incremental snapshots: Stream of fine-grained changes tagged by `IncrementalSource` (Mutation, Scroll, Input, StyleSheetRule, CanvasMutation, etc.).
   All emitted events are time-stamped in `record/src/record/index.ts` (`wrappedEmit`). Checkout conditions (`checkoutEveryNms` / `checkoutEveryNth`) trigger new full snapshots; respect these when extending emission logic.
   Never mutate previously emitted event objects—create new objects or extend before emission. Plugins may supply `eventProcessor` transforms; keep them idempotent.

## 3. Mirrors & Node Identity

`createMirror()` supplies a bidirectional mapping between DOM nodes and numeric IDs. Any feature adding nodes must ensure mirror consistency (lock during snapshot, unlock after). Use existing mutation emit wrappers (`wrappedMutationEmit`, etc.) instead of crafting raw events. For cross‑origin iframes, delegation occurs via `postMessage`; avoid direct DOM access.

## 4. Recording Pipeline Highlights

`record()` composes observers (`initObservers`) that feed domain-specific emitters (mutation, mouse, scroll, input, canvas, stylesheet). When adding a new incremental source:

- Define a new `IncrementalSource` enum member in `@rrweb/types` (ensure numeric stability—append at end).
- Extend observer init to capture raw data.
- Emit via `wrappedEmit({ type: EventType.IncrementalSnapshot, data: { source: IncrementalSource.<New>, ...payload } })`.
- Update replay switch logic to apply it (see replay handlers applying scroll/input/style updates).
  Maintain performance: guard high-frequency sources with `sampling` options (pattern used for mousemove & canvas).

## 5. Replay Pipeline Highlights

`Replayer` rebuilds from first full snapshot, then applies incremental events in time order, optionally using virtual DOM diffing (`rrdom`) when `useVirtualDom` is enabled. If adding a new source, implement its application where similar sources handled (search in `replay/index.ts` for existing `IncrementalSource` usages). For style or canvas changes, follow existing `applyStyleSheetRule` or `canvasMutation` patterns.

## 6. Plugin Architecture

Plugin architecture (historical): Upstream rrweb provided optional external plugin packages (console logging, sequential id, canvas-webrtc). This fork removed those packages; extend functionality directly via observers or internal wrappers instead of external plugin packages.

## 7. Build, Test, Lint Workflows

- Install: `yarn` (Yarn v1 workspaces). Node memory flags applied in `build:all`.
- Build all: `yarn build:all` (Turbo task `prepublish` per package -> `tsc -noEmit` + `vite build`).
- Dev watch (all packages): `yarn dev`.
- Test all: `yarn test` (Turbo orchestrates; some tests require headless Chromium via Puppeteer). Set `PUPPETEER_HEADLESS=true|false`.
- Single package iterative build: inside package `yarn dev`.
- Type check: `yarn check-types` (turbo cascade).
- Lint: `yarn lint` (ESLint + Markdown lint). Preserve flat config flag.
  Do not introduce new build tools; extend existing Vite + TypeScript config.

## 8. Performance & Safety Considerations

- Avoid synchronous heavy work inside high-frequency observers (mouse move, scroll, mutations). Batch or sample.
- Guard against infinite loops when patching globals (see console plugin `inStack` flag).
- Cross‑origin iframe handling: Failures accessing parent/child must be caught; ignore expected cross‑origin errors (see filtered message in stop handlers).
- Large log or canvas streams use thresholds; respect and reuse `lengthThreshold` patterns.

## 9. Adding Types / Enums

Centralize in `@rrweb/types`; after modifying, run `yarn references:update` if project references break, then `yarn check-types`. Ensure exported types appear in `dist/index.d.ts` via existing build (don’t hand-edit generated d.ts files).

## 10. Example: New Incremental Source Skeleton

1. Append enum in `packages/types/src/...` (IncrementalSource).
2. Add observer in `record/src/record/observer/...` returning payload.
3. Wire emission in `initObservers` chain.
4. Handle in replay dispatcher (`switch` / conditional) to mutate DOM or state.
5. Add minimal test in the appropriate package using `vitest run` pattern.

## 11. Common Pitfalls

- Forgetting to freeze/unfreeze mutation buffers before emitting non-mutation user events.
- Emitting events before `record()` has initialized full snapshot; always start with Meta + FullSnapshot.
- Mis-ordering events (always timestamp right before emit via existing helper).
- Creating memory leaks by not cleaning handlers on stop (mirror resets, managers `destroy()`).

## 12. Keep PRs Focused

Prefer adding feature flags or `sampling` options over silent behavior changes. Reference specific event types affected in descriptions.

Questions or unclear areas? Ask for specific domains (snapshot, replay diffing, plugin hooks) and provide a file path + intended change for refinement.
