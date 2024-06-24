# Changelog

## 2.25.0

### Various fixes & improvements

- fix(rrweb): clean up pointer tap circles when seeking by breadcrumb (#209) by @michellewzhang

## 2.24.0

### Various fixes & improvements

- fix(rrweb): null check for pointer (#208) by @michellewzhang

## 2.23.0

### Various fixes & improvements

- fix(rrweb): check if pointer is undefined before accessing pointerEl (#207) by @michellewzhang

## 2.22.0

### Various fixes & improvements

- fix: Missed downlevel-dts dep in types, update git sha (#206) by @billyvg

## 2.21.0

### Various fixes & improvements

- feat(snapshot): Check "blocked" status of iframes before accessing `contentDocument` (#201) by @billyvg
- fix(canvas): Fix missing `addWindow` call when `enableManualSnapshot==true` (#203) by @billyvg
- fix: Move `downlevel-dts` to devDeps (#204) by @billyvg
- feat(snapshot): Use unpatched `setTimeout` and `clearTimeout` (#200) by @billyvg

## 2.20.0

### Various fixes & improvements

- fix(rrweb): null check for pointerEl (#202) by @michellewzhang
- fix(ts): Forgot to include 3.8 typings dirs in `files` (#199) by @billyvg
- feat: Generate types for ts < 3.8 (#198) by @billyvg

## 2.19.0

### Various fixes & improvements

- use object.values (#196) by @michellewzhang
- use spread' (#196) by @michellewzhang
- add test (#196) by @michellewzhang
- remove canvas on touchEnd (#196) by @michellewzhang
- use flatMap (#196) by @michellewzhang
- modify tests (#196) by @michellewzhang
- some ref (#196) by @michellewzhang
- working tails (#196) by @michellewzhang
- ref (#196) by @michellewzhang
- mousetail for each pointer (#196) by @michellewzhang
- fix(rrweb): allow for drawing multiple mousetails (#196) by @michellewzhang

## 2.18.0

### Various fixes & improvements

- Replace Array.from with clean implementation (#1464) by @billyvg
- disable some tests that fail for our css parser (#195) by @billyvg
- revert https://github.com/getsentry/rrweb/pull/182 (#195) by @billyvg
- Revert "Fix some css issues with :hover and rewrite max-device-width (#1431)" (#195) by @billyvg

## 2.17.0

### Various fixes & improvements

- rm play() from tests (#190) by @michellewzhang
- add touch-device class inside createPointer (#190) by @michellewzhang
- rm code for creating pointers upfront (#190) by @michellewzhang
- tests that pass (#190) by @michellewzhang
- TESTS. (#190) by @michellewzhang
- move func out of the class (#190) by @michellewzhang
- :white-check-mark: add test (#190) by @michellewzhang
- add tests (#190) by @michellewzhang
- update snapshots for failing tests (#190) by @michellewzhang
- rm -1 (#190) by @michellewzhang
- optimizations (#190) by @michellewzhang
- feat(ci): Add `Replayer` to size limit check (#192) by @billyvg
- add size limit entry for Replayer (#190) by @michellewzhang
- Update packages/rrweb/src/replay/index.ts (#190) by @michellewzhang
- turn "run for branch" on for size limit GHA (#190) by @michellewzhang
- fix delete (#190) by @michellewzhang
- ts (#190) by @michellewzhang
- rm changes to package.json and yarn.lock (#190) by @michellewzhang
- rm export (#190) by @michellewzhang
- forgot a spot (#190) by @michellewzhang
- some fixes (#190) by @michellewzhang
- update snapshots (#168) by @p-mazhnik
- types (#190) by @michellewzhang
- name changes (#190) by @michellewzhang

_Plus 24 more_

## 2.16.0

### Various fixes & improvements

- fix merge conflict (#189) by @billyvg
- Revert "Masking: Avoid the repeated calls to `closest` when recursing through the DOM (#1349)" (#186) by @billyvg
- Revert "Full overhawl of video & audio playback to make it more complete (#1432)" (#186) by @billyvg
- Revert "Fix serialization and mutation of <textarea> elements (#1351)" (#186) by @billyvg
- Revert "Enable preserveSource (#1309)" (#186) by @billyvg
- upstream: Add config option to turn off all snapshotting and related observers (#163) by @billyvg
- optional (#183) by @billyvg
- fix: Change `maxCanvasSize` to be optional (#183) by @billyvg
- sentry fix (#180) by @billyvg
- perf: Avoid an extra function call and object clone during event emission (#1441) by @billyvg
- perf: Avoid an extra function call and object clone during event emission (#1441) by @eoghanmurray
- better splitting of selectors (#1440) by @daibhin
- Version Packages (alpha) (#1436) by @github-actions
- Add "types" field to fix error when using "moduleResolution": "NodeNext" (#1369) by @stefansundin
- Fix for test cases mentioned in #1379 (#1401) by @dengelke
- Full overhawl of video & audio playback to make it more complete (#1432) by @Juice10
- I forgot to pay attention to `yarn format` during merge of #1408 (#1452) by @eoghanmurray
- Expose constant SKIP_TIME_THRESHOLD as inactivePeriodThreshold in replayer (#1408) by @avillegasn
- protect against no parent node (#1445) by @daibhin
- fix: createImageBitmap throws DOMException if source is 0 (#1422) by @marandaneto
- Chore: Make inject script more robust on repl & stream (#1429) by @Juice10
- Version Packages (alpha) (#1291) by @github-actions
- Add HowdyGo to Who's using rrweb (#1423) by @dengelke
- Fix some css issues with :hover and rewrite max-device-width (#1431) by @eoghanmurray

_Plus 30 more_

## 2.14.0

### Various fixes & improvements

- sentry: add existing sentry tests (#182) by @billyvg
- better splitting of selectors (#1440) by @billyvg
- Fix for test cases mentioned in #1379 (#1401) by @billyvg
- Revert "fix: Incorrect parsing of functional pseudo class css selector (#169)" (#182) by @billyvg
- upstream: perf: only call `createHTMLDocument` where it is needed (#179) by @billyvg
- upstream: perf(rrweb): attribute mutation optimization (#178) by @billyvg
- upstream: Extended text masking function to include relevant HTMLElement (#164) by @billyvg
- fix(player): Update import path to use sentry namespace (#177) by @billyvg
- feat: Ensure to use unwrapped versions of `setTimeout` / `clearTimeout` (#176) by @mydea

## 2.13.0

### Various fixes & improvements

- feat(canvas): Add "maxCanvasSize" option for canvas (#174) by @billyvg
- test: skip flakey test (cross origin iframe) (#172) by @billyvg

## 2.12.0

### Various fixes & improvements

- fix(canvas): `createImageBitmap` throws when canvas size is 0 (#170) by @billyvg
- fix: fixes several cases where we access an undefined value (#171) by @billyvg
- fix: Incorrect parsing of functional pseudo class css selector (#169) by @billyvg

## 2.11.0

- feat: Enforce masking of credit card fields (https://github.com/getsentry/rrweb/pull/166)
- upstream: Feat: Add support for replaying :defined pseudo-class of custom elements (rrweb-io#1155) (https://github.com/getsentry/rrweb/pull/138)

## 2.10.0

### Various fixes & improvements

- fix(replayer): `<style>` node `rules` attr can be undefined (#162) by @billyvg
- feat: Register `errorHandler` inside of CanvasManager (#161) by @billyvg
- fix(snaptshot): Ensure `attr.name` is defined when collecting element attributes (#160) by @Lms24

## 2.9.0

- fix: Rename isManualSnapshot to enableManualSnapshot (#158)

## 2.8.0

- feat: Add manual canvas snapshot function (#149)
- feat: Remove getCanvasManager, export CanvasManager class directly (#153)
- fix: Protect against `matches()` being undefined (#154)

## 2.7.3

- Fix build issue with rrweb & rrweb-worker

## 2.7.2

- fix(rrweb): Use unpatched requestAnimationFrame when possible [#150](https://github.com/getsentry/rrweb/pull/150)

## 2.7.1

- build: Do not build rrweb-worker package (#147)

## 2.7.0

- ref: Avoid async in canvas (#143)
- feat: Bundle canvas worker manually (#144)
- build: Build for ES2020 (#142)

## 2.6.0

### Various fixes & improvements

- feat(canvas): Bind `mutationCb` outside of `getCanvasManager` (#141) by @billyvg

## 2.5.0

- Revert "fix: isCheckout is not included in fullsnapshot event (#1141)"

## 2.4.0

- revert: feat: Remove plugins related code, which is not used [#123](https://github.com/getsentry/rrweb/pull/123)
- feat: Export additional canvas-related types and functions (#134)

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
