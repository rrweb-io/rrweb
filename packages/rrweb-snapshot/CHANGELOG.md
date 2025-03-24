# rrweb-snapshot

## 2.0.0-alpha.29

### Patch Changes

- [#50](https://github.com/amplitude/rrweb/pull/50) [`7824d62`](https://github.com/amplitude/rrweb/commit/7824d62c7cf227c678ee1a1f500902fbfdd6c36a) Thanks [@jpollock-ampl](https://github.com/jpollock-ampl)! - Improve performance of splitCssText for <style> elements with large css content - see #1603

- [#50](https://github.com/amplitude/rrweb/pull/50) [`7824d62`](https://github.com/amplitude/rrweb/commit/7824d62c7cf227c678ee1a1f500902fbfdd6c36a) Thanks [@jpollock-ampl](https://github.com/jpollock-ampl)! - Improve performance of splitCssText for <style> elements with large css content - see #1603

## 2.0.0-alpha.28

## 2.0.0-alpha.27

### Major Changes

- [#47](https://github.com/amplitude/rrweb/pull/47) [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560) Thanks [@jxiwang](https://github.com/jxiwang)! - `NodeType` enum was moved from rrweb-snapshot to @rrweb/types
  The following types where moved from rrweb-snapshot to @rrweb/types: `documentNode`, `documentTypeNode`, `legacyAttributes`, `textNode`, `cdataNode`, `commentNode`, `elementNode`, `serializedNode`, `serializedNodeWithId`, `serializedElementNodeWithId`, `serializedTextNodeWithId`, `IMirror`, `INode`, `mediaAttributes`, `attributes` and `DataURLOptions`

### Patch Changes

- [#47](https://github.com/amplitude/rrweb/pull/47) [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560) Thanks [@jxiwang](https://github.com/jxiwang)! - fix dimensions for blocked element not being applied

- [#47](https://github.com/amplitude/rrweb/pull/47) [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560) Thanks [@jxiwang](https://github.com/jxiwang)! - Slight simplification to how we replace :hover after #1458

- [#47](https://github.com/amplitude/rrweb/pull/47) [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560) Thanks [@jxiwang](https://github.com/jxiwang)! - Edge case: Provide support for mutations on a <style> element which (unusually) has multiple text nodes

## 2.0.0-alpha.26

## 2.0.0-alpha.25

### Major Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference. If you include rrweb in a script tag and referred to a `.js` file, you'll now have to update that path to include a `.umd.cjs` file. Distributed files have new paths, filenames and extensions. All packages now no longer include a `.js` files, instead they include `.cjs`, `.umd.cjs` and `.mjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments. The `.mjs` files are ES modules that can be used in modern browsers, node.js and bundlers that support ES modules. The `.cjs` files are CommonJS modules that can be used in older Node.js environments.

### Minor Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`3ae57a6`](https://github.com/amplitude/rrweb/commit/3ae57a6d8803f4e076a448fa7e3967fa3c125487) Thanks [@jxiwang](https://github.com/jxiwang)! - Record dialog's modal status for replay in rrweb. (Currently triggering `dialog.showModal()` is not supported in rrweb-snapshot's rebuild)

### Patch Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`becf687`](https://github.com/amplitude/rrweb/commit/becf687910a21be618c8644642673217d75a4bfe) Thanks [@jxiwang](https://github.com/jxiwang)! - Fix that the optional `maskInputFn` was being accidentally ignored during the creation of the full snapshot

- [#43](https://github.com/amplitude/rrweb/pull/43) [`178f1e6`](https://github.com/amplitude/rrweb/commit/178f1e6e450e0903e9dadc4dc96dd74236f296ba) Thanks [@jxiwang](https://github.com/jxiwang)! - fix: duplicate textContent for style elements cause incremental style mutations to be invalid

- [#43](https://github.com/amplitude/rrweb/pull/43) [`6676611`](https://github.com/amplitude/rrweb/commit/6676611aa9ef5ef777d55289d7887293965e317f) Thanks [@jxiwang](https://github.com/jxiwang)! - Fix `url()` rewrite for nested stylesheets by rewriting during stringification instead of after

- [#43](https://github.com/amplitude/rrweb/pull/43) [`3ef1e70`](https://github.com/amplitude/rrweb/commit/3ef1e709eb43b21505ed6bde405c2f6f83b0badc) Thanks [@jxiwang](https://github.com/jxiwang)! - optimisation: skip mask check on leaf elements

- [#43](https://github.com/amplitude/rrweb/pull/43) [`4442d21`](https://github.com/amplitude/rrweb/commit/4442d21c5b1b6fb6dd6af6f52f97ca0317005ad8) Thanks [@jxiwang](https://github.com/jxiwang)! - Add slimDOM option to block animation on <title> tag; enabled when the 'all' value is used for slimDOM

- [#43](https://github.com/amplitude/rrweb/pull/43) [`9e9226f`](https://github.com/amplitude/rrweb/commit/9e9226fc00031dc6c2012dedcd53ec41db86b975) Thanks [@jxiwang](https://github.com/jxiwang)! - Reverse monkey patch built in methods to support LWC (and other frameworks like angular which monkey patch built in methods).

## 2.0.0-alpha.24

### Patch Changes

- [#39](https://github.com/amplitude/rrweb/pull/39) [`d4dacd5`](https://github.com/amplitude/rrweb/commit/d4dacd507dfa8f7719ae6e136042843ba47b7302) Thanks [@jxiwang](https://github.com/jxiwang)! - inlineImages: during snapshot avoid adding an event listener for inlining of same-origin images (async listener mutates the snapshot which can be problematic)

- [#39](https://github.com/amplitude/rrweb/pull/39) [`e3c831c`](https://github.com/amplitude/rrweb/commit/e3c831c5442fc5d213f3a02dba8b746c9c87d37d) Thanks [@jxiwang](https://github.com/jxiwang)! - (when `recordCanvas: true`): ensure we use doc.createElement instead of document.createElement to allow use in non-browser e.g. jsdom environments

## 2.0.0-alpha.23

### Patch Changes

- [#23](https://github.com/amplitude/rrweb/pull/23) [`9f0fb7c`](https://github.com/amplitude/rrweb/commit/9f0fb7c53f6910a33a69a843a8773e939f42b0fa) Thanks [@jxiwang](https://github.com/jxiwang)! - better support for coexistence with older libraries (e.g. MooTools & Prototype.js) which modify the in-built `Array.from` function

- [#23](https://github.com/amplitude/rrweb/pull/23) [`0983ef8`](https://github.com/amplitude/rrweb/commit/0983ef8c952ff0038e555e4147e008d2fb174248) Thanks [@jxiwang](https://github.com/jxiwang)! - Fixup for multiple background-clip replacement

- [#23](https://github.com/amplitude/rrweb/pull/23) [`88a15cf`](https://github.com/amplitude/rrweb/commit/88a15cf221f245a9e98ca0b074e7abced5798c5b) Thanks [@jxiwang](https://github.com/jxiwang)! - Avoid recreating the same element every time, instead, we cache and we just update the element.

  Before: 779k ops/s
  After: 860k ops/s

  Benchmark: https://jsbench.me/ktlqztuf95/1

- [#23](https://github.com/amplitude/rrweb/pull/23) [`6d5cbf0`](https://github.com/amplitude/rrweb/commit/6d5cbf098d3322a9d2e29df0664d199025332e2a) Thanks [@jxiwang](https://github.com/jxiwang)! - Bugfix after #1434 perf improvements: fix that blob urls persist on the shared anchor element and can't be later modified

## 2.0.0-alpha.22

### Minor Changes

- [#22](https://github.com/amplitude/rrweb/pull/22) [`87cba12`](https://github.com/amplitude/rrweb/commit/87cba12ebbc2da78671c16be6932c10b4c1cbb6d) Thanks [@jxiwang](https://github.com/jxiwang)! - Video and Audio elements now also capture `playbackRate`, `muted`, `loop`, `volume`.

### Patch Changes

- [#22](https://github.com/amplitude/rrweb/pull/22) [`a1d5962`](https://github.com/amplitude/rrweb/commit/a1d596254aa12bd85295f7c759ed28637cdffa04) Thanks [@jxiwang](https://github.com/jxiwang)! - Feat: Add 'isCustom' flag to serialized elements.

  This flag is used to indicate whether the element is a custom element or not. This is useful for replaying the :defined pseudo-class of custom elements.

- [#22](https://github.com/amplitude/rrweb/pull/22) [`ffdf49c`](https://github.com/amplitude/rrweb/commit/ffdf49c6e9f44177f80b320efdbfdb85a4da0756) Thanks [@jxiwang](https://github.com/jxiwang)! - Capture stylesheets designated as `rel="preload"`

- [#22](https://github.com/amplitude/rrweb/pull/22) [`ba7f3d5`](https://github.com/amplitude/rrweb/commit/ba7f3d50e982d6d2e5c1dd4868a536db5d3572e9) Thanks [@jxiwang](https://github.com/jxiwang)! - Snapshot performance when masking text: Avoid the repeated calls to `closest` when recursing through the DOM

## 2.0.0-alpha.21

## 2.0.0-alpha.20

### Patch Changes

- [#27](https://github.com/amplitude/rrweb/pull/27) [`5b85646`](https://github.com/amplitude/rrweb/commit/5b85646a9557c89d594c6a484f576fbdb0c38eb7) Thanks [@jxiwang](https://github.com/jxiwang)! - Replay: Replace negative lookbehind in regexes from css parser as it causes issues with Safari 16

## 2.0.0-alpha.19

### Patch Changes

- [#25](https://github.com/amplitude/rrweb/pull/25) [`f876ea5`](https://github.com/amplitude/rrweb/commit/f876ea55e21653d682a983b320f611d9ab09e0ad) Thanks [@lewgordon-amplitude](https://github.com/lewgordon-amplitude)! - Don't double-record the values of <textarea>s when they already have some content prefilled #1301

## 2.0.0-alpha.18

### Patch Changes

- [#20](https://github.com/amplitude/rrweb/pull/20) [`66c6fcb`](https://github.com/amplitude/rrweb/commit/66c6fcbf213694f8a6ff4784cec1e9b1320ae429) Thanks [@jxiwang](https://github.com/jxiwang)! - better nested css selector splitting when commas or brackets happen to be in quoted text

## 2.0.0-alpha.17

## 2.0.0-alpha.16

## 2.0.0-alpha.15

## 2.0.0-alpha.14

## 2.0.0-alpha.13

## 2.0.0-alpha.12

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
