# Changelog

## 2.3.0

- feat: Skip addHoverClass when stylesheet is >= 1MB [#130](https://github.com/getsentry/rrweb/pull/130) 

## 2.2.0

- feat: Export getCanvasManager & allow passing it to record() [#122](https://github.com/getsentry/rrweb/pull/122)
- feat: Remove hooks related code, which is not used [#126](https://github.com/getsentry/rrweb/pull/126)
- feat: Remove plugins related code, which is not used [#123](https://github.com/getsentry/rrweb/pull/123)
- feat: Refactor module scope vars & export mirror & `takeFullSnapshot` directly [#113](https://github.com/getsentry/rrweb/pull/113)
- fix(rrweb): Fix rule.style being undefined [#121](https://github.com/getsentry/rrweb/pull/121)
- ref: Avoid unnecessary cloning of objects or arrays [#125](https://github.com/getsentry/rrweb/pull/125)
- ref: Avoid cloning events to add timestamp [#124](https://github.com/getsentry/rrweb/pull/124)

## 2.1.1

- fix: dimensions not being applied [#117](https://github.com/getsentry/rrweb/pull/117)

## 2.1.0

- feat: Add build flags to allow noop iframe/canvas/shadow dom managers [#114](https://github.com/getsentry/rrweb/pull/114)

## 2.0.1

- fix: Fix checking for patchTarget in initAdoptedStyleSheetObserver [#110](https://github.com/getsentry/rrweb/pull/110)

## 2.0.0

- Sentry fork of rrweb@2.0.0-alpha.11 with enhanced privacy features

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
