# rrweb-snapshot

## 2.0.0-alpha.18

### Minor Changes

- [#1432](https://github.com/rrweb-io/rrweb/pull/1432) [`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961) Thanks [@Juice10](https://github.com/Juice10)! - Video and Audio elements now also capture `playbackRate`, `muted`, `loop`, `volume`.

### Patch Changes

- [#1401](https://github.com/rrweb-io/rrweb/pull/1401) [`f7c6973`](https://github.com/rrweb-io/rrweb/commit/f7c6973ae9c21b9ea014bdef7101f976f04d9356) Thanks [@dengelke](https://github.com/dengelke)! - Fix css parsing errors

## 2.0.0-alpha.12

### Minor Changes

- [#1310](https://github.com/rrweb-io/rrweb/pull/1310) [`7c0dc9d`](https://github.com/rrweb-io/rrweb/commit/7c0dc9dfe1564c9d6624557c5b394e7844955882) Thanks [@benjackwhite](https://github.com/benjackwhite)! - Extends maskTextFn to pass the HTMLElement to the deciding function

### Patch Changes

- [#1272](https://github.com/rrweb-io/rrweb/pull/1272) [`58c9104`](https://github.com/rrweb-io/rrweb/commit/58c9104eddc8b7994a067a97daae5684e42f892f) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Perf: Avoid creation of intermediary array when iterating over style rules

- [#1351](https://github.com/rrweb-io/rrweb/pull/1351) [`a2be77b`](https://github.com/rrweb-io/rrweb/commit/a2be77b82826c4be0e7f3c7c9f7ee50476d5f6f8) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Don't double-record the values of <textarea>s when they already have some content prefilled #1301

- [#1431](https://github.com/rrweb-io/rrweb/pull/1431) [`a7c33f2`](https://github.com/rrweb-io/rrweb/commit/a7c33f2093c4d92faf7ae25e8bb0e088d122c13b) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Ensure :hover works on replayer, even if a rule is behind a media query
  Respect the intent behind max-device-width and min-device-width media queries so that their effects are apparent in the replayer context

- [#1155](https://github.com/rrweb-io/rrweb/pull/1155) [`8aea5b0`](https://github.com/rrweb-io/rrweb/commit/8aea5b00a4dfe5a6f59bd2ae72bb624f45e51e81) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Feat: Add 'isCustom' flag to serialized elements.

  This flag is used to indicate whether the element is a custom element or not. This is useful for replaying the :defined pseudo-class of custom elements.

- [#1374](https://github.com/rrweb-io/rrweb/pull/1374) [`314a8dd`](https://github.com/rrweb-io/rrweb/commit/314a8dde5a13095873b89d07bac7c949918bf817) Thanks [@andrewpomeroy](https://github.com/andrewpomeroy)! - Capture stylesheets designated as `rel="preload"`

- [#1349](https://github.com/rrweb-io/rrweb/pull/1349) [`07ac5c9`](https://github.com/rrweb-io/rrweb/commit/07ac5c9e1371824ec3ffb705f9250bbe10f4b73e) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Snapshot performance when masking text: Avoid the repeated calls to `closest` when recursing through the DOM

## 2.0.0-alpha.11

### Patch Changes

- [#1279](https://github.com/rrweb-io/rrweb/pull/1279) [`11f6567`](https://github.com/rrweb-io/rrweb/commit/11f6567fd81ef9ed0f954a7b6d5e39653f56004f) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Extend to run fixBrowserCompatibilityIssuesInCSS over inline stylesheets

- [#1287](https://github.com/rrweb-io/rrweb/pull/1287) [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7) Thanks [@Juice10](https://github.com/Juice10)! - Upgrade all projects to typescript 4.9.5

- [#1287](https://github.com/rrweb-io/rrweb/pull/1287) [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7) Thanks [@Juice10](https://github.com/Juice10)! - Add workaround for Chrome/Edge CSS `@import` escaping bug: https://bugs.chromium.org/p/chromium/issues/detail?id=1472259

## 2.0.0-alpha.10

### Patch Changes

- [#1253](https://github.com/rrweb-io/rrweb/pull/1253) [`c6600e7`](https://github.com/rrweb-io/rrweb/commit/c6600e742b8ec0b6295816bb5de9edcd624d975e) Thanks [@mydea](https://github.com/mydea)! - Fix CSS rules captured in Safari

## 2.0.0-alpha.9

### Patch Changes

- [#1183](https://github.com/rrweb-io/rrweb/pull/1183) [`d7c72bf`](https://github.com/rrweb-io/rrweb/commit/d7c72bff0724b46a6fa94af455220626a27104fe) Thanks [@mydea](https://github.com/mydea)! - fix: Ensure attributes are lowercased when checking

## 2.0.0-alpha.8

### Minor Changes

- [#1188](https://github.com/rrweb-io/rrweb/pull/1188) [`bc84246`](https://github.com/rrweb-io/rrweb/commit/bc84246f78849a80dbb8fe9b4e76117afcc5c3f7) Thanks [@benjackwhite](https://github.com/benjackwhite)! - feat: Extends maskInputFn to pass the HTMLElement to the deciding function

### Patch Changes

- [#1148](https://github.com/rrweb-io/rrweb/pull/1148) [`d0fdc0f`](https://github.com/rrweb-io/rrweb/commit/d0fdc0f273bb156a1faab4782b40fbec8dccf915) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Improve: Add try catch to snapshot.ts 's masking text function. Fixes [#1118](https://github.com/rrweb-io/rrweb/issues/1118).

## 2.0.0-alpha.7

### Minor Changes

- [#1170](https://github.com/rrweb-io/rrweb/pull/1170) [`d2582e9`](https://github.com/rrweb-io/rrweb/commit/d2582e9a81197130cd93bc1dd778e16fddfb0be3) Thanks [@mydea](https://github.com/mydea)! - feat: Ensure password inputs remain masked when switching input type

### Patch Changes

- [#1174](https://github.com/rrweb-io/rrweb/pull/1174) [`e7f0c80`](https://github.com/rrweb-io/rrweb/commit/e7f0c808c3f348fb27d1acd5fa300a5d92b14d00) Thanks [@wfk007](https://github.com/wfk007)! - Fix: [#1172](https://github.com/rrweb-io/rrweb/issues/1172) don't replace original onload function of Images

## 2.0.0-alpha.6

### Minor Changes

- [#1152](https://github.com/rrweb-io/rrweb/pull/1152) [`eac9b18`](https://github.com/rrweb-io/rrweb/commit/eac9b18bbfa3c350797b99b583dd93a5fc32b828) Thanks [@mydea](https://github.com/mydea)! - feat: Ignore `autoplay` attribute on video/audio elements

### Patch Changes

- [#1133](https://github.com/rrweb-io/rrweb/pull/1133) [`c28ef5f`](https://github.com/rrweb-io/rrweb/commit/c28ef5f658abb93086504581409cf7a376db48dc) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Fix: CSS transitions are incorrectly being applied upon rebuild in Firefox. Presumably FF doesn't finished parsing the styles in time, and applies e.g. a default margin:0 to elements which have a non-zero margin set in CSS, along with a transition on them.

  Related bug report to Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1816672​

- [#1130](https://github.com/rrweb-io/rrweb/pull/1130) [`f6f07e9`](https://github.com/rrweb-io/rrweb/commit/f6f07e953376634a4caf28ff8cbfed5a017c4347) Thanks [@Equlnox](https://github.com/Equlnox)! - Fix: Make relative path detection in stylesheet URLs to detect more types of URL protocols when inlining stylesheets.

- [#1157](https://github.com/rrweb-io/rrweb/pull/1157) [`8e47ca1`](https://github.com/rrweb-io/rrweb/commit/8e47ca1021ebb4fc036b37623ef10abf7976d6dd) Thanks [@mydea](https://github.com/mydea)! - fix: Explicitly handle `null` attribute values

## 2.0.0-alpha.5

### Patch Changes

- [#1095](https://github.com/rrweb-io/rrweb/pull/1095) [`1385f7a`](https://github.com/rrweb-io/rrweb/commit/1385f7acc0052f83be1458a7b00e18c026ee393f) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix duplicated shadow doms

- [#1126](https://github.com/rrweb-io/rrweb/pull/1126) [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Refactor all suffix of bundled scripts with commonjs module from 'js' to cjs [#1087](https://github.com/rrweb-io/rrweb/pull/1087).
