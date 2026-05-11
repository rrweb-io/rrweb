# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## <small>2.1.1 (2026-05-11)</small>

- feat(release): migrate from semantic-release to Lerna (workflow_dispatch) (#114) ([68250f9](https://github.com/amplitude/rrweb/commit/68250f9)), closes [#114](https://github.com/amplitude/rrweb/issues/114) [#109](https://github.com/amplitude/rrweb/issues/109)
- feat(release): replace changesets with semantic-release (SR-4223) (#110) ([998e389](https://github.com/amplitude/rrweb/commit/998e389)), closes [#110](https://github.com/amplitude/rrweb/issues/110)
- fix(replay): preserve shadow-DOM adoptedStyleSheets across seek-cache restores (SR-4260) (#111) ([b4382c4](https://github.com/amplitude/rrweb/commit/b4382c4)), closes [#111](https://github.com/amplitude/rrweb/issues/111)

# Changelog

## v1.0.0

### Featrues & Improvements

- Support record same-origin non-sandboxed iframe.
- Support record open-mode shadow DOM.
- Implement the plugin API.
- Export `record.takeFullSnapshot` as a public API
- Record and replay drag events.
- Add options to mask texts (#540).

### Fixes

- Get the original MutationObserver when Angular patched it.
- Fix RangeError: Maximum call stack size exceeded (#479).
- Fix the linked-list implementation in the recorder.
- Don't perform newly added actions if the player is paused (#539).
- Fix inaccurate mouse position (#522)

### Breaking Changes

- Deprecated the usage of `rrweb.mirror`. Please use `record.mirror` and `replayer.getMirror()` instead.
- Deprecated the record option `recordLog `. See the new plugin API [here](./docs/recipes/console.md).
- Deprecated the replay option ` `. See the new plugin API [here](./docs/recipes/console.md).
