# Contributing

Thanks for your interest in contributing to this fork of rrweb.

This repository maintains a lockstep versioning scheme across all published `@newrelic/rrweb-*` packages using [Changesets](https://github.com/changesets/changesets). A 1.0.0 baseline was established by archiving historical pre-fork changeset entries into `/.changeset-archive` and creating an empty `baseline-reset` changeset.

## Workflow Overview

1. Branch: create a feature or fix branch from `master`.
2. Implement changes with tests and docs.
3. Run lint & tests locally: `yarn lint && yarn test`.
4. Add a changeset: `yarn changeset` (pick bump type per guidance below). Because of lockstep grouping, *every* published package listed in `fixed` may receive the highest bump level among touched packages.
5. Open PR. CI will check build, type, and test status. `changeset status` must show at least one planned release (unless intentionally using an `--empty` changeset for non-publishing meta changes).
6. Upon merge to `master`, a release PR (or automated action) can run `yarn changeset version` then `yarn changeset publish` (or equivalent release pipeline).

## Choosing Bump Types

Use semantic versioning:
- patch: bug fixes, internal refactors with no public API or type changes.
- minor: backward-compatible feature additions, new event types guarded by optional flags, new public options with safe defaults.
- major: breaking API changes, event schema changes, option behavior changes, or removal of deprecated APIs.

Because packages are fixed, selecting a higher bump for one will raise them all to at least that level. Prefer the lowest accurate bump across the set.

## When to Use an Empty Changeset
For purely repository meta updates (docs-only, CI config, test-only stability tweaks) that should not trigger a publish, run:
```
yarn changeset add --empty
```
Document the rationale in the generated markdown.

## Adding New Packages
If you add a new publishable workspace package, update `.changeset/config.json` `fixed` array to include it so versioning remains in sync. Also add it to the baseline section in the root `CHANGELOG.md` after the first release involving it.

## Baseline Context
The fork unified versions at 1.0.0. Previous upstream alpha / prerelease entries live outside the active `.changeset` directory for historical reference. Do not reintroduce those markdown files back under `.changeset/`.

## Releasing Locally (Manual)
```
yarn changeset version
# Review package.json and CHANGELOG updates
git add .
git commit -m "chore: version packages"
yarn changeset publish --access public
```

## Code Style & Tooling
- TypeScript strict settings enforced via shared `tsconfig.base.json`.
- Build: `vite build` with per-package configs.
- Tests: Vitest + Puppeteer. Use `PUPPETEER_HEADLESS=true` in CI for reliability.
- Lint: ESLint flat config; run `yarn lint --fix` for autofixes.

## Performance Considerations
Observer additions must be low overhead; batch high-frequency events and honor existing sampling options. Avoid blocking the main thread in mutation/canvas observers.

## Security & Privacy
When recording DOM: respect masking options and do not expand untrusted HTML strings. Avoid leaking cross-origin frame content—fail gracefully.

## Questions
Open a GitHub Discussion or Issue with reproduction steps if reporting a bug. For feature proposals, outline event model impact and replay implications.

Happy recording & replaying!
