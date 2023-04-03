# rrweb-snapshot

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
