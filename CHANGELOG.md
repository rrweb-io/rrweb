# Changelog

## v1.0.0

### Features & Improvements

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
