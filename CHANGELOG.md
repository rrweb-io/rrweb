# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## <small>2.1.2 (2026-06-30)</small>

- fix: resolve browser cicd issues (#131) ([546e481](https://github.com/amplitude/rrweb/commit/546e481)), closes [#131](https://github.com/amplitude/rrweb/issues/131)
- fix(release): add NPM_TOKEN auth + skipVersion input for publish recovery (#115) ([eff2db9](https://github.com/amplitude/rrweb/commit/eff2db9)), closes [#115](https://github.com/amplitude/rrweb/issues/115) [#110](https://github.com/amplitude/rrweb/issues/110)
- fix(release): gate publish on no-browser test suite (#130) ([a60e71a](https://github.com/amplitude/rrweb/commit/a60e71a)), closes [#130](https://github.com/amplitude/rrweb/issues/130)
- fix(release): publish via npm CLI to get full OIDC trusted publishing (#121) ([65a98bf](https://github.com/amplitude/rrweb/commit/65a98bf)), closes [#121](https://github.com/amplitude/rrweb/issues/121) [#120](https://github.com/amplitude/rrweb/issues/120)
- fix(release): reset working tree after build so publish sees a clean state (#116) ([a88cc13](https://github.com/amplitude/rrweb/commit/a88cc13)), closes [#116](https://github.com/amplitude/rrweb/issues/116)
- fix(release): restore OIDC trusted publishing by removing token poisoning (#119) ([a072037](https://github.com/amplitude/rrweb/commit/a072037)), closes [#119](https://github.com/amplitude/rrweb/issues/119) [#89](https://github.com/amplitude/rrweb/issues/89) [#115](https://github.com/amplitude/rrweb/issues/115) [#118](https://github.com/amplitude/rrweb/issues/118)
- fix(release): use lerna publish from-package instead of from-git (#117) ([b7e6620](https://github.com/amplitude/rrweb/commit/b7e6620)), closes [#117](https://github.com/amplitude/rrweb/issues/117)
- chore: add environment to publish for RRWeb (#127) ([5975699](https://github.com/amplitude/rrweb/commit/5975699)), closes [#127](https://github.com/amplitude/rrweb/issues/127)
- chore: fix playwright download url (#129) ([faeafe1](https://github.com/amplitude/rrweb/commit/faeafe1)), closes [#129](https://github.com/amplitude/rrweb/issues/129)
- chore(build): migrate from yarn 1 to pnpm (#124) ([830a643](https://github.com/amplitude/rrweb/commit/830a643)), closes [#124](https://github.com/amplitude/rrweb/issues/124) [#124](https://github.com/amplitude/rrweb/issues/124)
- chore(release): enable verbose npm logging + serial publish for diagnosis (#120) ([1824601](https://github.com/amplitude/rrweb/commit/1824601)), closes [#120](https://github.com/amplitude/rrweb/issues/120) [#119](https://github.com/amplitude/rrweb/issues/119)
- chore(release): gate publish on tests passing (#122) ([639d385](https://github.com/amplitude/rrweb/commit/639d385)), closes [#122](https://github.com/amplitude/rrweb/issues/122)
- feat: add dom target field (#128) ([5452438](https://github.com/amplitude/rrweb/commit/5452438)), closes [#128](https://github.com/amplitude/rrweb/issues/128)
- docs(readme): add releases section + conventional-commit guidance (#123) ([283a212](https://github.com/amplitude/rrweb/commit/283a212)), closes [#123](https://github.com/amplitude/rrweb/issues/123)
- debug(release): disable provenance and add npm auth diagnostics (#118) ([d0ed2b5](https://github.com/amplitude/rrweb/commit/d0ed2b5)), closes [#118](https://github.com/amplitude/rrweb/issues/118) [#109](https://github.com/amplitude/rrweb/issues/109)

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
