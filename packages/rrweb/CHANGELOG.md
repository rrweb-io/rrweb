# rrweb

## 2.0.0-alpha.20

### Patch Changes

- [#1763](https://github.com/rrweb-io/rrweb/pull/1763) [`6388fb5`](https://github.com/rrweb-io/rrweb/commit/6388fb5a468e1a860ab8bb5c6826c811dcc3100c) Thanks [@wfk007](https://github.com/wfk007)! - fix: wujie monkeypatches ownerDocument

- Updated dependencies [[`6388fb5`](https://github.com/rrweb-io/rrweb/commit/6388fb5a468e1a860ab8bb5c6826c811dcc3100c)]:
  - @rrweb/utils@2.0.0-alpha.20
  - rrweb-snapshot@2.0.0-alpha.20
  - rrdom@2.0.0-alpha.20
  - @rrweb/types@2.0.0-alpha.20

## 2.0.0-alpha.19

### Patch Changes

- [#1615](https://github.com/rrweb-io/rrweb/pull/1615) [`dc20cd4`](https://github.com/rrweb-io/rrweb/commit/dc20cd45cc63058325784444af6bd32ed2cace48) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Improve performance of splitCssText for <style> elements with large css content - see #1603

- [#1640](https://github.com/rrweb-io/rrweb/pull/1640) [`3e9e42f`](https://github.com/rrweb-io/rrweb/commit/3e9e42fdfd6349087d7a0345af1b39dd56528502) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Improve performance of splitCssText for <style> elements with large css content - see #1603

- [#1600](https://github.com/rrweb-io/rrweb/pull/1600) [`a6893f7`](https://github.com/rrweb-io/rrweb/commit/a6893f73abe217a95d28996e01b7ec8261e42de3) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - #1575 Fix that postcss could fall over when trying to process css content split arbitrarily

- [#1631](https://github.com/rrweb-io/rrweb/pull/1631) [`88ea2d0`](https://github.com/rrweb-io/rrweb/commit/88ea2d05c1869026111c91f7aa14ea7a7193fcd8) Thanks [@pauldambra](https://github.com/pauldambra)! - Move patch function into @rrweb/utils to improve bundling

- [#1695](https://github.com/rrweb-io/rrweb/pull/1695) [`fc390a9`](https://github.com/rrweb-io/rrweb/commit/fc390a954c4fc17fe2ee0e2b6edba634611349e0) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - fix: rrweb recorder may throw error when stopping recording after an iframe becomes cross-origin

- [#1618](https://github.com/rrweb-io/rrweb/pull/1618) [`79837ac`](https://github.com/rrweb-io/rrweb/commit/79837ac8f2f459935f6737210890b5c12033a53b) Thanks [@billyvg](https://github.com/billyvg)! - This fixes an issue where inlined CSS from a remotely loaded `<link>` does not get applied properly due to object reference mutation.

- [#1614](https://github.com/rrweb-io/rrweb/pull/1614) [`6f4e691`](https://github.com/rrweb-io/rrweb/commit/6f4e691f39cc59b655d1be4f951128beecb88acb) Thanks [@billyvg](https://github.com/billyvg)! - Change to ignore all link[rel="modulepreload"] instead of including only those with `as="script"`

- [#1599](https://github.com/rrweb-io/rrweb/pull/1599) [`9cd28b7`](https://github.com/rrweb-io/rrweb/commit/9cd28b703ec08a77dc6b790dbffb20dfb8e9a513) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - #1596 Add masking for innerText mutations on textarea elements

- Updated dependencies [[`47a7c3f`](https://github.com/rrweb-io/rrweb/commit/47a7c3faa6fdbd3a515f473dc3a979acd2c8276e), [`dc20cd4`](https://github.com/rrweb-io/rrweb/commit/dc20cd45cc63058325784444af6bd32ed2cace48), [`3e9e42f`](https://github.com/rrweb-io/rrweb/commit/3e9e42fdfd6349087d7a0345af1b39dd56528502), [`a6893f7`](https://github.com/rrweb-io/rrweb/commit/a6893f73abe217a95d28996e01b7ec8261e42de3), [`88ea2d0`](https://github.com/rrweb-io/rrweb/commit/88ea2d05c1869026111c91f7aa14ea7a7193fcd8), [`f2419f2`](https://github.com/rrweb-io/rrweb/commit/f2419f2513e9ad3ea597e2b5a4463a4fbf74868f), [`6f4e691`](https://github.com/rrweb-io/rrweb/commit/6f4e691f39cc59b655d1be4f951128beecb88acb), [`76df979`](https://github.com/rrweb-io/rrweb/commit/76df9799ecc14930fa914e5623a73ea7726e3747)]:
  - rrweb-snapshot@2.0.0-alpha.19
  - @rrweb/utils@2.0.0-alpha.19
  - rrdom@2.0.0-alpha.19
  - @rrweb/types@2.0.0-alpha.19

## 2.0.0-alpha.18

### Minor Changes

- [#1543](https://github.com/rrweb-io/rrweb/pull/1543) [`53b83bb`](https://github.com/rrweb-io/rrweb/commit/53b83bb037f9cb30c93179548f436ed776f143ab) Thanks [@JonasBa](https://github.com/JonasBa)! - Optimize isParentRemoved check

### Patch Changes

- [#1535](https://github.com/rrweb-io/rrweb/pull/1535) [`04ee6ed`](https://github.com/rrweb-io/rrweb/commit/04ee6eda57157f0e04f18f907d8f3e59ababc753) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Slight simplification to how we replace :hover after #1458

- [#1437](https://github.com/rrweb-io/rrweb/pull/1437) [`5fbb904`](https://github.com/rrweb-io/rrweb/commit/5fbb904edb653f3da17e6775ee438d81ef0bba83) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Edge case: Provide support for mutations on a <style> element which (unusually) has multiple text nodes

- [#1593](https://github.com/rrweb-io/rrweb/pull/1593) [`5a78938`](https://github.com/rrweb-io/rrweb/commit/5a789385a341311ba327a768fe0e2f0f2f5002ee) Thanks [@daibhin](https://github.com/daibhin)! - `NodeType` enum was moved from rrweb-snapshot to @rrweb/types
  The following types where moved from rrweb-snapshot to @rrweb/types: `documentNode`, `documentTypeNode`, `legacyAttributes`, `textNode`, `cdataNode`, `commentNode`, `elementNode`, `serializedNode`, `serializedNodeWithId`, `serializedElementNodeWithId`, `serializedTextNodeWithId`, `IMirror`, `INode`, `mediaAttributes`, `attributes` and `DataURLOptions`
- Updated dependencies [[`8e55c45`](https://github.com/rrweb-io/rrweb/commit/8e55c455ff2987a3b5f367f23f48c1f2de74ce45), [`02cc62d`](https://github.com/rrweb-io/rrweb/commit/02cc62dd44b52f579a332b55c49896a5cb7cc694), [`04ee6ed`](https://github.com/rrweb-io/rrweb/commit/04ee6eda57157f0e04f18f907d8f3e59ababc753), [`5fbb904`](https://github.com/rrweb-io/rrweb/commit/5fbb904edb653f3da17e6775ee438d81ef0bba83), [`5a78938`](https://github.com/rrweb-io/rrweb/commit/5a789385a341311ba327a768fe0e2f0f2f5002ee)]:
  - rrdom@2.0.0-alpha.18
  - rrweb-snapshot@2.0.0-alpha.18
  - @rrweb/types@2.0.0-alpha.18
  - @rrweb/utils@2.0.0-alpha.18

## 2.0.0-alpha.17

### Minor Changes

- [#1503](https://github.com/rrweb-io/rrweb/pull/1503) [`335639a`](https://github.com/rrweb-io/rrweb/commit/335639af9b0ce7f70eb0f38ce113d877c7325158) Thanks [@Juice10](https://github.com/Juice10)! - Support top-layer <dialog> components. Fixes #1381.

### Patch Changes

- [#1417](https://github.com/rrweb-io/rrweb/pull/1417) [`40bbc25`](https://github.com/rrweb-io/rrweb/commit/40bbc25fc287badc317a53f2d3f21b1c9f2b211b) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - fix: duplicate textContent for style elements cause incremental style mutations to be invalid

- [#1527](https://github.com/rrweb-io/rrweb/pull/1527) [`68076b7`](https://github.com/rrweb-io/rrweb/commit/68076b724ff19d198d4f351a05063b85e1705a8c) Thanks [@arredgroup](https://github.com/arredgroup)! - Export takeFullSnapshot function for a recording process

- [#1515](https://github.com/rrweb-io/rrweb/pull/1515) [`8059d96`](https://github.com/rrweb-io/rrweb/commit/8059d9695146626b102b2059a3a9b932d5f598f6) Thanks [@okejminja](https://github.com/okejminja)! - Added support for deprecated addRule & removeRule methods

- [#1509](https://github.com/rrweb-io/rrweb/pull/1509) [`be6bf52`](https://github.com/rrweb-io/rrweb/commit/be6bf52c248c35de1b3491e3a3440ff61f876414) Thanks [@Juice10](https://github.com/Juice10)! - Reverse monkey patch built in methods to support LWC (and other frameworks like angular which monkey patch built in methods).

- Updated dependencies [[`40bbc25`](https://github.com/rrweb-io/rrweb/commit/40bbc25fc287badc317a53f2d3f21b1c9f2b211b), [`335639a`](https://github.com/rrweb-io/rrweb/commit/335639af9b0ce7f70eb0f38ce113d877c7325158), [`335639a`](https://github.com/rrweb-io/rrweb/commit/335639af9b0ce7f70eb0f38ce113d877c7325158), [`d350da8`](https://github.com/rrweb-io/rrweb/commit/d350da8552d8616dd118ee550bdfbce082986562), [`be6bf52`](https://github.com/rrweb-io/rrweb/commit/be6bf52c248c35de1b3491e3a3440ff61f876414)]:
  - rrweb-snapshot@2.0.0-alpha.17
  - rrdom@2.0.0-alpha.17
  - @rrweb/types@2.0.0-alpha.17
  - @rrweb/utils@2.0.0-alpha.17

## 2.0.0-alpha.16

### Patch Changes

- [#1386](https://github.com/rrweb-io/rrweb/pull/1386) [`a2c8a1a`](https://github.com/rrweb-io/rrweb/commit/a2c8a1a37bfcf8389b280af792262c8263a979a3) Thanks [@ababik](https://github.com/ababik)! - Fix that the optional `maskInputFn` was being accidentally ignored during the creation of the full snapshot

- [#1512](https://github.com/rrweb-io/rrweb/pull/1512) [`d08624c`](https://github.com/rrweb-io/rrweb/commit/d08624cb28add386c3618a0e6607424c3f1884d8) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - optimisation: skip mask check on leaf elements

- Updated dependencies [[`a2c8a1a`](https://github.com/rrweb-io/rrweb/commit/a2c8a1a37bfcf8389b280af792262c8263a979a3), [`d08624c`](https://github.com/rrweb-io/rrweb/commit/d08624cb28add386c3618a0e6607424c3f1884d8)]:
  - rrweb-snapshot@2.0.0-alpha.16
  - rrdom@2.0.0-alpha.16
  - @rrweb/types@2.0.0-alpha.16

## 2.0.0-alpha.15

### Major Changes

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Split plugins out of rrweb and move them into their own packages: @rrweb/packer, @rrweb/rrweb-plugin-canvas-webrtc-record, @rrweb/rrweb-plugin-canvas-webrtc-replay, @rrweb/rrweb-plugin-sequential-id-record, @rrweb/rrweb-plugin-sequential-id-replay, @rrweb/rrweb-plugin-console-record, @rrweb/rrweb-plugin-console-replay. Check out the README of each package for more information or check out https://github.com/rrweb-io/rrweb/pull/1033 to see the changes.

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Distributed files have new filenames, paths and extensions. **Important: If you reference distributed files or types directly, you might have to update your paths/filenames. E.g. you import from `rrweb/typings/...` or `rrdom/es`. However you run `import rrweb from 'rrweb'` you won't notice a difference with this change.** If you include rrweb files directly in a script tag, you might have to update that path to include a the `.umd.cjs` files instead. All `.js` files now use ES modules which can be used in modern browsers, node.js and bundlers that support ES modules. All npm packages now also ship `.cjs` and `.umd.cjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments (similar to the previous `.js` files). The `.cjs` files are CommonJS modules that can be used in older Node.js environments. Types should be better defined in `package.json` and if you need specific types they might be exported from new packages (for example `PlayerMachineState` and `SpeedMachineState` are now exported from `@rrweb/replay`). Check the `package.json`'s `main` and `exports` field for the available files.

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Remove the rrweb-all.js, rrweb-record.js, and rrweb-replay.js files from `rrweb` package. Now you can use `@rrweb/all`, `@rrweb/record`, and `@rrweb/replay` packages instead. Check out the README of each package for more information or check out [PR #1033](https://github.com/rrweb-io/rrweb/pull/1033) to see the changes.

### Patch Changes

- [#1033](https://github.com/rrweb-io/rrweb/pull/1033) [`7261c43`](https://github.com/rrweb-io/rrweb/commit/7261c43f60973e88325edf832e4d0e057fbff0ae) Thanks [@Juice10](https://github.com/Juice10)! - Export `ReplayPlugin` from rrweb directly. Previously we had to do `import type { ReplayPlugin } from 'rrweb/dist/types';` now we can do `import type { ReplayPlugin } from 'rrweb';`

- [#1468](https://github.com/rrweb-io/rrweb/pull/1468) [`4014305`](https://github.com/rrweb-io/rrweb/commit/40143059446cee5c042c007b1c2e976f36e172f5) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - inlineImages: during snapshot avoid adding an event listener for inlining of same-origin images (async listener mutates the snapshot which can be problematic)

- [#1489](https://github.com/rrweb-io/rrweb/pull/1489) [`609b7fa`](https://github.com/rrweb-io/rrweb/commit/609b7fac79a552f746dc880a28927dee382cd082) Thanks [@JonasBa](https://github.com/JonasBa)! - Optimize performance of isParentRemoved by converting it to an iterative procedure

- [#1493](https://github.com/rrweb-io/rrweb/pull/1493) [`82f6fec`](https://github.com/rrweb-io/rrweb/commit/82f6fecf36413ecbc994a510144487f1de20d1d5) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Replay: Replace negative lookbehind in regexes from css parser as it causes issues with Safari 16

- [#1353](https://github.com/rrweb-io/rrweb/pull/1353) [`5c27b76`](https://github.com/rrweb-io/rrweb/commit/5c27b763192bda9dd91806f95df7c1cd0ab083a6) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: some nested cross-origin iframes can't be recorded

- [#1328](https://github.com/rrweb-io/rrweb/pull/1328) [`d38893f`](https://github.com/rrweb-io/rrweb/commit/d38893f6338facf331fd1f6e63c121120b81177d) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Refactor to preclude the need for a continuous raf loop running in the background which is related to shadowDom

- [#1295](https://github.com/rrweb-io/rrweb/pull/1295) [`d7cf8dd`](https://github.com/rrweb-io/rrweb/commit/d7cf8dd07547f6fb22ef82e341a88357c4053bd3) Thanks [@colingm](https://github.com/colingm)! - Return early for child same origin frames

- [#760](https://github.com/rrweb-io/rrweb/pull/760) [`e08706a`](https://github.com/rrweb-io/rrweb/commit/e08706ae60268b6eb05c6292ef948c71bd423ce3) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Add slimDOM option to block animation on <title> tag; enabled when the 'all' value is used for slimDOM

- Updated dependencies [[`4014305`](https://github.com/rrweb-io/rrweb/commit/40143059446cee5c042c007b1c2e976f36e172f5), [`82f6fec`](https://github.com/rrweb-io/rrweb/commit/82f6fecf36413ecbc994a510144487f1de20d1d5), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`f3cf092`](https://github.com/rrweb-io/rrweb/commit/f3cf0928df30d5ed5c0d573c524be6e744c0f8d3), [`e08706a`](https://github.com/rrweb-io/rrweb/commit/e08706ae60268b6eb05c6292ef948c71bd423ce3)]:
  - rrweb-snapshot@2.0.0-alpha.15
  - rrdom@2.0.0-alpha.15
  - @rrweb/types@2.0.0-alpha.15

## 2.0.0-alpha.14

### Patch Changes

- [#1464](https://github.com/rrweb-io/rrweb/pull/1464) [`03b5216`](https://github.com/rrweb-io/rrweb/commit/03b5216a9403f1509b4f69d1d71ef9874277fe91) Thanks [@colingm](https://github.com/colingm)! - better support for coexistence with older libraries (e.g. MooTools & Prototype.js) which modify the in-built `Array.from` function

- [#1441](https://github.com/rrweb-io/rrweb/pull/1441) [`ae6908d`](https://github.com/rrweb-io/rrweb/commit/ae6908dcdcd7c732c1ce79eea19de5240bec1151) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - perf: Avoid an extra function call and object clone during event emission

- [#1481](https://github.com/rrweb-io/rrweb/pull/1481) [`46f1b25`](https://github.com/rrweb-io/rrweb/commit/46f1b252a5919c68c68e825bd6089cc2e7d34e7c) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Fix and test for bug #1457 which was affecting replay of complex tailwind css

- [#1476](https://github.com/rrweb-io/rrweb/pull/1476) [`cbbd1e5`](https://github.com/rrweb-io/rrweb/commit/cbbd1e55f1f7fa2eed9fa11e4152b509bdfd88f7) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Fixup for multiple background-clip replacement

- [#1467](https://github.com/rrweb-io/rrweb/pull/1467) [`e96f668`](https://github.com/rrweb-io/rrweb/commit/e96f668c86bd0ab5dc190bb2957a170271bb2ebc) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Bugfix after #1434 perf improvements: fix that blob urls persist on the shared anchor element and can't be later modified

- Updated dependencies [[`03b5216`](https://github.com/rrweb-io/rrweb/commit/03b5216a9403f1509b4f69d1d71ef9874277fe91), [`46f1b25`](https://github.com/rrweb-io/rrweb/commit/46f1b252a5919c68c68e825bd6089cc2e7d34e7c), [`cbbd1e5`](https://github.com/rrweb-io/rrweb/commit/cbbd1e55f1f7fa2eed9fa11e4152b509bdfd88f7), [`5e7943d`](https://github.com/rrweb-io/rrweb/commit/5e7943dbae6e2cde76c484bdd26bc0b96f1b6dce), [`c0f83af`](https://github.com/rrweb-io/rrweb/commit/c0f83afab8f1565633de0e986b7e96fa56f2d25c), [`e96f668`](https://github.com/rrweb-io/rrweb/commit/e96f668c86bd0ab5dc190bb2957a170271bb2ebc)]:
  - rrweb-snapshot@2.0.0-alpha.14
  - rrdom@2.0.0-alpha.14
  - @rrweb/types@2.0.0-alpha.14

## 2.0.0-alpha.13

### Minor Changes

- [#1432](https://github.com/rrweb-io/rrweb/pull/1432) [`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961) Thanks [@Juice10](https://github.com/Juice10)! - Full overhawl of `video` and `audio` element playback. More robust and fixes lots of bugs related to pausing/playing/skipping/muting/playbackRate etc.

### Patch Changes

- [#1422](https://github.com/rrweb-io/rrweb/pull/1422) [`3d1877c`](https://github.com/rrweb-io/rrweb/commit/3d1877cff83d9a018630674fb6e730050ceef812) Thanks [@marandaneto](https://github.com/marandaneto)! - fix: createImageBitmap throws DOMException if source is 0 width or height

- [#1432](https://github.com/rrweb-io/rrweb/pull/1432) [`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961) Thanks [@Juice10](https://github.com/Juice10)! - Record `loop` on `<audio>` & `<video>` elements.

- [#1445](https://github.com/rrweb-io/rrweb/pull/1445) [`02f50d2`](https://github.com/rrweb-io/rrweb/commit/02f50d260cfe72209c94de1679336737f238e216) Thanks [@daibhin](https://github.com/daibhin)! - fix: protect against missing parentNode

- Updated dependencies [[`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961), [`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961), [`f7c6973`](https://github.com/rrweb-io/rrweb/commit/f7c6973ae9c21b9ea014bdef7101f976f04d9356), [`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961), [`c278d06`](https://github.com/rrweb-io/rrweb/commit/c278d068a0e2f1175cce7cc63920ac1fbf4783cf)]:
  - rrdom@2.0.0-alpha.13
  - rrweb-snapshot@2.0.0-alpha.13
  - @rrweb/types@2.0.0-alpha.13

## 2.0.0-alpha.12

### Minor Changes

- [#1310](https://github.com/rrweb-io/rrweb/pull/1310) [`7c0dc9d`](https://github.com/rrweb-io/rrweb/commit/7c0dc9dfe1564c9d6624557c5b394e7844955882) Thanks [@benjackwhite](https://github.com/benjackwhite)! - Extends maskTextFn to pass the HTMLElement to the deciding function

### Patch Changes

- [#1403](https://github.com/rrweb-io/rrweb/pull/1403) [`af0962c`](https://github.com/rrweb-io/rrweb/commit/af0962cc6c80b693bbc622520032d17342685cf6) Thanks [@pauldambra](https://github.com/pauldambra)! - safely capture BigInt values with the console log plugin"

- [#1327](https://github.com/rrweb-io/rrweb/pull/1327) [`57a940a`](https://github.com/rrweb-io/rrweb/commit/57a940afac0bdd14cd82937915d53110b5311673) Thanks [@mydea](https://github.com/mydea)! - fix: Fix checking for `patchTarget` in `initAdoptedStyleSheetObserver`

- [#1155](https://github.com/rrweb-io/rrweb/pull/1155) [`8aea5b0`](https://github.com/rrweb-io/rrweb/commit/8aea5b00a4dfe5a6f59bd2ae72bb624f45e51e81) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Feat: Add support for replaying :defined pseudo-class of custom elements

- [#1340](https://github.com/rrweb-io/rrweb/pull/1340) [`9c6edfe`](https://github.com/rrweb-io/rrweb/commit/9c6edfe2261680b4e92284be69f9d183b1eca8f4) Thanks [@mydea](https://github.com/mydea)! - ref: Avoid unnecessary cloning of objects or arrays

- [#1383](https://github.com/rrweb-io/rrweb/pull/1383) [`1e0b273`](https://github.com/rrweb-io/rrweb/commit/1e0b27382210db0168d2a79d82c13698082b0983) Thanks [@daibhin](https://github.com/daibhin)! - export the canvasMutation function

- [#1324](https://github.com/rrweb-io/rrweb/pull/1324) [`1fe39ab`](https://github.com/rrweb-io/rrweb/commit/1fe39ab0db7f5d2b04f4a4f39fb5c0cfee33a1f8) Thanks [@Belen-Luo](https://github.com/Belen-Luo)! - export eventWithTime for consumption by typescript code

- [#1343](https://github.com/rrweb-io/rrweb/pull/1343) [`05478c3`](https://github.com/rrweb-io/rrweb/commit/05478c36dde03a118099783d908bb3e465e9859c) Thanks [@mdellanoce](https://github.com/mdellanoce)! - use WeakMap for faster attributeCursor lookup while processing attribute mutations

- [#1272](https://github.com/rrweb-io/rrweb/pull/1272) [`58c9104`](https://github.com/rrweb-io/rrweb/commit/58c9104eddc8b7994a067a97daae5684e42f892f) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Perf: Avoid creation of intermediary array when iterating over style rules

- [#1311](https://github.com/rrweb-io/rrweb/pull/1311) [`980a38c`](https://github.com/rrweb-io/rrweb/commit/980a38c816d763833fc3491f56d03c959a41122d) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Add 'recordDOM' config option to turn off recording of DOM (making recordings unreplayable). Specialist use case e.g. only heatmap click/scroll recording

- [#1351](https://github.com/rrweb-io/rrweb/pull/1351) [`a2be77b`](https://github.com/rrweb-io/rrweb/commit/a2be77b82826c4be0e7f3c7c9f7ee50476d5f6f8) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Don't double-record the values of <textarea>s when they already have some content prefilled #1301

- [#1431](https://github.com/rrweb-io/rrweb/pull/1431) [`a7c33f2`](https://github.com/rrweb-io/rrweb/commit/a7c33f2093c4d92faf7ae25e8bb0e088d122c13b) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Ensure :hover works on replayer, even if a rule is behind a media query
  Respect the intent behind max-device-width and min-device-width media queries so that their effects are apparent in the replayer context

- [#1374](https://github.com/rrweb-io/rrweb/pull/1374) [`314a8dd`](https://github.com/rrweb-io/rrweb/commit/314a8dde5a13095873b89d07bac7c949918bf817) Thanks [@andrewpomeroy](https://github.com/andrewpomeroy)! - Capture stylesheets designated as `rel="preload"`

- [#1349](https://github.com/rrweb-io/rrweb/pull/1349) [`07ac5c9`](https://github.com/rrweb-io/rrweb/commit/07ac5c9e1371824ec3ffb705f9250bbe10f4b73e) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Snapshot performance when masking text: Avoid the repeated calls to `closest` when recursing through the DOM

- Updated dependencies [[`58c9104`](https://github.com/rrweb-io/rrweb/commit/58c9104eddc8b7994a067a97daae5684e42f892f), [`a2be77b`](https://github.com/rrweb-io/rrweb/commit/a2be77b82826c4be0e7f3c7c9f7ee50476d5f6f8), [`a7c33f2`](https://github.com/rrweb-io/rrweb/commit/a7c33f2093c4d92faf7ae25e8bb0e088d122c13b), [`8aea5b0`](https://github.com/rrweb-io/rrweb/commit/8aea5b00a4dfe5a6f59bd2ae72bb624f45e51e81), [`314a8dd`](https://github.com/rrweb-io/rrweb/commit/314a8dde5a13095873b89d07bac7c949918bf817), [`e607e83`](https://github.com/rrweb-io/rrweb/commit/e607e83b21d45131a56c1ff606e9519a5b475fc1), [`7c0dc9d`](https://github.com/rrweb-io/rrweb/commit/7c0dc9dfe1564c9d6624557c5b394e7844955882), [`07ac5c9`](https://github.com/rrweb-io/rrweb/commit/07ac5c9e1371824ec3ffb705f9250bbe10f4b73e)]:
  - rrweb-snapshot@2.0.0-alpha.12
  - rrdom@2.0.0-alpha.12
  - @rrweb/types@2.0.0-alpha.12

## 2.0.0-alpha.11

### Patch Changes

- [#1279](https://github.com/rrweb-io/rrweb/pull/1279) [`11f6567`](https://github.com/rrweb-io/rrweb/commit/11f6567fd81ef9ed0f954a7b6d5e39653f56004f) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Extend to run fixBrowserCompatibilityIssuesInCSS over inline stylesheets

- [#1287](https://github.com/rrweb-io/rrweb/pull/1287) [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7) Thanks [@Juice10](https://github.com/Juice10)! - Upgrade all projects to typescript 4.9.5

- Updated dependencies [[`11f6567`](https://github.com/rrweb-io/rrweb/commit/11f6567fd81ef9ed0f954a7b6d5e39653f56004f), [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7), [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7)]:
  - rrweb-snapshot@2.0.0-alpha.11
  - @rrweb/types@2.0.0-alpha.11
  - rrdom@2.0.0-alpha.11

## 2.0.0-alpha.10

### Patch Changes

- [#1269](https://github.com/rrweb-io/rrweb/pull/1269) [`7103625`](https://github.com/rrweb-io/rrweb/commit/7103625b4683cbd75732ee03973e38f573847b1c) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Don't include redundant data from text/attribute mutations on just-added nodes

- [#1268](https://github.com/rrweb-io/rrweb/pull/1268) [`d872d28`](https://github.com/rrweb-io/rrweb/commit/d872d2809e3ec8d6ff5d3d5f43bc81aff70e7548) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Compact style mutation fixes and improvements

  - fixes when style updates contain a 'var()' on a shorthand property #1246
  - further ensures that style mutations are compact by reverting to string method if it is shorter

- [#1262](https://github.com/rrweb-io/rrweb/pull/1262) [`36da39d`](https://github.com/rrweb-io/rrweb/commit/36da39db366a9f80c28549771ed331090a1c6647) Thanks [@billyvg](https://github.com/billyvg)! - feat: Add `ignoreSelector` option

  Similar to ignoreClass, but accepts a CSS selector so that you can use any CSS selector.

- [#1251](https://github.com/rrweb-io/rrweb/pull/1251) [`bbbfa22`](https://github.com/rrweb-io/rrweb/commit/bbbfa226fc5882a01ecc1607b713f0caf797775e) Thanks [@wfk007](https://github.com/wfk007)! - fix: Resize and MediaInteraction events repeat generated after the iframe appeared

- [#1254](https://github.com/rrweb-io/rrweb/pull/1254) [`d0fbe23`](https://github.com/rrweb-io/rrweb/commit/d0fbe23c632021410a6dd45f9028a9a012467261) Thanks [@mydea](https://github.com/mydea)! - Handle case where `event` is null/undefined

- [#1273](https://github.com/rrweb-io/rrweb/pull/1273) [`a3de582`](https://github.com/rrweb-io/rrweb/commit/a3de582e9c32be9e0ccd84bb7df756af6b0594f7) Thanks [@Juice10](https://github.com/Juice10)! - Canvas FPS recording: override `preserveDrawingBuffer: true` on canvas creation.
  Canvas replay: fix flickering canvas elemenrs.
  Canvas FPS recording: fix bug that wipes webgl(2) canvas backgrounds while recording.
- Updated dependencies [[`d872d28`](https://github.com/rrweb-io/rrweb/commit/d872d2809e3ec8d6ff5d3d5f43bc81aff70e7548), [`c6600e7`](https://github.com/rrweb-io/rrweb/commit/c6600e742b8ec0b6295816bb5de9edcd624d975e)]:
  - @rrweb/types@2.0.0-alpha.10
  - rrweb-snapshot@2.0.0-alpha.10
  - rrdom@2.0.0-alpha.10

## 2.0.0-alpha.9

### Patch Changes

- [#1196](https://github.com/rrweb-io/rrweb/pull/1196) [`490b3e2`](https://github.com/rrweb-io/rrweb/commit/490b3e2b62b62d61e6f6f5391d5b879194c9a221) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Guard against presence of older 3rd party javascript libraries which redefine Date.now()

- [#1220](https://github.com/rrweb-io/rrweb/pull/1220) [`a1ec9a2`](https://github.com/rrweb-io/rrweb/commit/a1ec9a273e6634eec67098fdd880ee681648fbbd) Thanks [@wfk007](https://github.com/wfk007)! - perf: optimize performance of the DoubleLinkedList get

- [#1196](https://github.com/rrweb-io/rrweb/pull/1196) [`490b3e2`](https://github.com/rrweb-io/rrweb/commit/490b3e2b62b62d61e6f6f5391d5b879194c9a221) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Guard against redefinition of Date.now by third party libraries which are also present on a page alongside rrweb

- [#1183](https://github.com/rrweb-io/rrweb/pull/1183) [`d7c72bf`](https://github.com/rrweb-io/rrweb/commit/d7c72bff0724b46a6fa94af455220626a27104fe) Thanks [@mydea](https://github.com/mydea)! - fix: Ensure attributes are lowercased when checking

- [#1214](https://github.com/rrweb-io/rrweb/pull/1214) [`ebcbe8b`](https://github.com/rrweb-io/rrweb/commit/ebcbe8b0d746a0a4c07d3530387f920900f35215) Thanks [@wfk007](https://github.com/wfk007)! - perf: optimize the performance of record in processMutation phase

- Updated dependencies [[`b798f2d`](https://github.com/rrweb-io/rrweb/commit/b798f2dbc07b5a24dcaf40d164159200b6c0679d), [`d7c72bf`](https://github.com/rrweb-io/rrweb/commit/d7c72bff0724b46a6fa94af455220626a27104fe)]:
  - rrdom@2.0.0-alpha.9
  - rrweb-snapshot@2.0.0-alpha.9
  - @rrweb/types@2.0.0-alpha.9

## 2.0.0-alpha.8

### Minor Changes

- [#1129](https://github.com/rrweb-io/rrweb/pull/1129) [`979d2b1`](https://github.com/rrweb-io/rrweb/commit/979d2b1847a3d05e2731722952e4d6bd8be54f40) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - click events now include a `.pointerType` attribute which distinguishes between ['pen', 'mouse' and 'touch' events](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType). There is no new PenDown/PenUp events, but these can be detected with a MouseDown/MouseUp + pointerType=pen

- [#1188](https://github.com/rrweb-io/rrweb/pull/1188) [`bc84246`](https://github.com/rrweb-io/rrweb/commit/bc84246f78849a80dbb8fe9b4e76117afcc5c3f7) Thanks [@benjackwhite](https://github.com/benjackwhite)! - feat: Extends maskInputFn to pass the HTMLElement to the deciding function

### Patch Changes

- [#1198](https://github.com/rrweb-io/rrweb/pull/1198) [`b5e30cf`](https://github.com/rrweb-io/rrweb/commit/b5e30cf6cc7f5335d674ef1917a92bdf2895fe9e) Thanks [@charliegracie](https://github.com/charliegracie)! - Reset the finished flag in Controller `goto` instead of `handleProgressClick` so that it is properly handled if `goto` is called directly.

- [#1184](https://github.com/rrweb-io/rrweb/pull/1184) [`aa79db7`](https://github.com/rrweb-io/rrweb/commit/aa79db7568578ea3a413292450cd64f07481e5dd) Thanks [@mydea](https://github.com/mydea)! - fix: Ensure getting the type of inputs works

- Updated dependencies [[`979d2b1`](https://github.com/rrweb-io/rrweb/commit/979d2b1847a3d05e2731722952e4d6bd8be54f40), [`bc84246`](https://github.com/rrweb-io/rrweb/commit/bc84246f78849a80dbb8fe9b4e76117afcc5c3f7), [`d0fdc0f`](https://github.com/rrweb-io/rrweb/commit/d0fdc0f273bb156a1faab4782b40fbec8dccf915)]:
  - @rrweb/types@2.0.0-alpha.8
  - rrweb-snapshot@2.0.0-alpha.8
  - rrdom@2.0.0-alpha.8

## 2.0.0-alpha.7

### Minor Changes

- [#1170](https://github.com/rrweb-io/rrweb/pull/1170) [`d2582e9`](https://github.com/rrweb-io/rrweb/commit/d2582e9a81197130cd93bc1dd778e16fddfb0be3) Thanks [@mydea](https://github.com/mydea)! - feat: Ensure password inputs remain masked when switching input type

- [#1107](https://github.com/rrweb-io/rrweb/pull/1107) [`a225d8e`](https://github.com/rrweb-io/rrweb/commit/a225d8e1412a69a761c22eb45565fff0b0ce5c11) Thanks [@mydea](https://github.com/mydea)! - feat: Allow to pass `errorHandler` as record option

### Patch Changes

- [#1179](https://github.com/rrweb-io/rrweb/pull/1179) [`e0f862b`](https://github.com/rrweb-io/rrweb/commit/e0f862bac7dbaa9cfd778f5ef0f5f3fd8cbe6def) Thanks [@wfk007](https://github.com/wfk007)! - Fix: [#1178](https://github.com/rrweb-io/rrweb/issues/1178) remove warning related to worker_threads while building

- [#1186](https://github.com/rrweb-io/rrweb/pull/1186) [`267e990`](https://github.com/rrweb-io/rrweb/commit/267e990dc0e45a5acaaa3ee89db7ae9171520d54) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: processed-node-manager is created even in the environment that doesn't need a recorder

- [#1145](https://github.com/rrweb-io/rrweb/pull/1145) [`a82a3b4`](https://github.com/rrweb-io/rrweb/commit/a82a3b42b125aaaea607410b49f012933466c523) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - For a mutation which removes a node, reduce the number of spurious warnings to take into account that an anscestor (rather than just a parent) may have been just removed

- [#1191](https://github.com/rrweb-io/rrweb/pull/1191) [`1e6f71b`](https://github.com/rrweb-io/rrweb/commit/1e6f71b3cddcfafe78b9e40edfbd75e485702e4e) Thanks [@Juice10](https://github.com/Juice10)! - Only apply touch-active styling on flush

- [#1191](https://github.com/rrweb-io/rrweb/pull/1191) [`1e6f71b`](https://github.com/rrweb-io/rrweb/commit/1e6f71b3cddcfafe78b9e40edfbd75e485702e4e) Thanks [@Juice10](https://github.com/Juice10)! - Trigger mouse movement and hover with mouse up and mouse down events when replayer.pause(...) is called.

- [#1163](https://github.com/rrweb-io/rrweb/pull/1163) [`4cb4d0e`](https://github.com/rrweb-io/rrweb/commit/4cb4d0e95a540a366bdec157fe78d9f099514818) Thanks [@zhaobosky](https://github.com/zhaobosky)! - Fix: some websites rebuild imcomplete

  1. Some websites, addedSet in emit function is not empty, but the result converted from Array.from is empty.
  2. Some websites polyfill classList functions of HTML elements. Their implementation may throw errors and cause the snapshot to fail. I add try-catch statements to make the code robust.

- Updated dependencies [[`d2582e9`](https://github.com/rrweb-io/rrweb/commit/d2582e9a81197130cd93bc1dd778e16fddfb0be3), [`e7f0c80`](https://github.com/rrweb-io/rrweb/commit/e7f0c808c3f348fb27d1acd5fa300a5d92b14d00)]:
  - rrweb-snapshot@2.0.0-alpha.7
  - rrdom@2.0.0-alpha.7
  - @rrweb/types@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- [#1156](https://github.com/rrweb-io/rrweb/pull/1156) [`e65465e`](https://github.com/rrweb-io/rrweb/commit/e65465e808178a80a4ba84970f02162ba812955e) Thanks [@Code-Crash](https://github.com/Code-Crash)! - Fix the statement which is getting changed by Microbundle

- [#1139](https://github.com/rrweb-io/rrweb/pull/1139) [`f27e545`](https://github.com/rrweb-io/rrweb/commit/f27e545e1871ed2c1753d37543f556e8ddc406b4) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: Switch from virtual dom to real dom before rebuilding fullsnapshot

- [#1130](https://github.com/rrweb-io/rrweb/pull/1130) [`f6f07e9`](https://github.com/rrweb-io/rrweb/commit/f6f07e953376634a4caf28ff8cbfed5a017c4347) Thanks [@Equlnox](https://github.com/Equlnox)! - Fix: Make relative path detection in stylesheet URLs to detect more types of URL protocols when inlining stylesheets.

- [#1141](https://github.com/rrweb-io/rrweb/pull/1141) [`3416c3a`](https://github.com/rrweb-io/rrweb/commit/3416c3a769e2bd2ddfbb88f5c4ff139871c567be) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: isCheckout is missed in all fullsnapshot events

- [#1157](https://github.com/rrweb-io/rrweb/pull/1157) [`8e47ca1`](https://github.com/rrweb-io/rrweb/commit/8e47ca1021ebb4fc036b37623ef10abf7976d6dd) Thanks [@mydea](https://github.com/mydea)! - fix: Explicitly handle `null` attribute values

- [#1136](https://github.com/rrweb-io/rrweb/pull/1136) [`aaabdbd`](https://github.com/rrweb-io/rrweb/commit/aaabdbdff5df2abd1a294c40ed89e74bf8b2ec7c) Thanks [@benjackwhite](https://github.com/benjackwhite)! - fix: Recursive logging bug with console recording

- [#1159](https://github.com/rrweb-io/rrweb/pull/1159) [`5e6c132`](https://github.com/rrweb-io/rrweb/commit/5e6c132a4d0e5f5524b2201d6a73dae62b4a0877) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - For users of userTriggeredOnInput setting: also set userTriggered to false on Input attribute modifications; this was previously empty this variant of IncrementalSource.Input

- Updated dependencies [[`c28ef5f`](https://github.com/rrweb-io/rrweb/commit/c28ef5f658abb93086504581409cf7a376db48dc), [`f6f07e9`](https://github.com/rrweb-io/rrweb/commit/f6f07e953376634a4caf28ff8cbfed5a017c4347), [`eac9b18`](https://github.com/rrweb-io/rrweb/commit/eac9b18bbfa3c350797b99b583dd93a5fc32b828), [`f27e545`](https://github.com/rrweb-io/rrweb/commit/f27e545e1871ed2c1753d37543f556e8ddc406b4), [`8e47ca1`](https://github.com/rrweb-io/rrweb/commit/8e47ca1021ebb4fc036b37623ef10abf7976d6dd)]:
  - rrweb-snapshot@2.0.0-alpha.6
  - rrdom@2.0.0-alpha.6
  - @rrweb/types@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- [#1095](https://github.com/rrweb-io/rrweb/pull/1095) [`1385f7a`](https://github.com/rrweb-io/rrweb/commit/1385f7acc0052f83be1458a7b00e18c026ee393f) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix duplicated shadow doms

- [#1126](https://github.com/rrweb-io/rrweb/pull/1126) [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Refactor all suffix of bundled scripts with commonjs module from 'js' to cjs [#1087](https://github.com/rrweb-io/rrweb/pull/1087).

- [#1126](https://github.com/rrweb-io/rrweb/pull/1126) [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: improve rrdom robustness [#1091](https://github.com/rrweb-io/rrweb/pull/1091).

- [#1127](https://github.com/rrweb-io/rrweb/pull/1127) [`3cc4323`](https://github.com/rrweb-io/rrweb/commit/3cc4323094065a12f8b65afecd45061d604e245f) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Refactor: Improve performance by 80% in a super large benchmark case.

  1. Refactor: change the data structure of childNodes from array to linked list
  2. Improve the performance of the "contains" function. New algorithm will reduce the complexity from O(n) to O(logn)

- [#1121](https://github.com/rrweb-io/rrweb/pull/1121) [`502d15d`](https://github.com/rrweb-io/rrweb/commit/502d15df9f7f43b3408ccfbb3f14c4bb007883c4) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: outdated ':hover' styles can't be removed from iframes or shadow doms

- [#1122](https://github.com/rrweb-io/rrweb/pull/1122) [`8d209a6`](https://github.com/rrweb-io/rrweb/commit/8d209a62f31c4c80e3e5bc36e47d7282ee854ac7) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Add missing change logs manually. In the next version, all change logs will be generated automatically.

  - [`a220835`](https://github.com/rrweb-io/rrweb/commit/a220835eeb81ca4f294682e060d46c8853720d7f) [#1053](https://github.com/rrweb-io/rrweb/pull/1053) Thanks [@Juice10](https://github.com/Juice10)! - Fix: Post message can break cross origin iframe recording.

  - [`7e8dcdb`](https://github.com/rrweb-io/rrweb/commit/7e8dcdb11dc5dfefcdd19ff5e13ec9d8b5c24dcc) [#1063](https://github.com/rrweb-io/rrweb/pull/1063) Thanks [@lele0108](https://github.com/lele0108)! - Fix: muted false -> true not being set.

  - [`b655361`](https://github.com/rrweb-io/rrweb/commit/b655361a5f0d50a053fcd0e5c823b8494c33b89c) [#1067](https://github.com/rrweb-io/rrweb/pull/1067) Thanks [@mydea](https://github.com/mydea)! - Export recordOptions type.

  - [`36b44e1`](https://github.com/rrweb-io/rrweb/commit/36b44e104b91fc74c3e69684111240cd23105340) [#1042](https://github.com/rrweb-io/rrweb/pull/1042) Thanks [@wfk007](https://github.com/wfk007)! - Fix: Failed to execute insertBefore on Node.

  - [`44e92cb`](https://github.com/rrweb-io/rrweb/commit/44e92cbff981c36e754dfcb9a184eae9e7292ecf) [#1058](https://github.com/rrweb-io/rrweb/pull/1058) Thanks [@mydea](https://github.com/mydea)! - Handle errors when observing iframes.

  - [`729b8bf`](https://github.com/rrweb-io/rrweb/commit/729b8bf38c8c7f2e1b22b4e0f7cab14f0807bc74) [#1083](https://github.com/rrweb-io/rrweb/pull/1083) Thanks [@Juice10](https://github.com/Juice10)! - Fix: Catch iframe manager & fix formatting issues.

  - [`03821d9`](https://github.com/rrweb-io/rrweb/commit/03821d9b9fa0513e6e373881d43102ceb9388340) [#1083](https://github.com/rrweb-io/rrweb/pull/1083) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Harmonize on a single getWindowScroll

  - [`d08913d`](https://github.com/rrweb-io/rrweb/commit/d08913d0dc506dbf119e94686fe5f01c415316c9) [#1086](https://github.com/rrweb-io/rrweb/pull/1086) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: missed adopted style sheets of shadow doms in checkout full snapshot.

  - [`66abe17`](https://github.com/rrweb-io/rrweb/commit/66abe17832dbb23b3948af1c394f9a02caccc17b) [#1032](https://github.com/rrweb-io/rrweb/pull/1032) Thanks [@dbseel](https://github.com/dbseel)! - Fix: isBlocked throws on invalid HTML element.

  - [`07aa1b2`](https://github.com/rrweb-io/rrweb/commit/07aa1b2807da5a9a1db678ebc3ff59320a300d06) [#1049](https://github.com/rrweb-io/rrweb/pull/1049) Thanks [@Juice10](https://github.com/Juice10)! - Fix: shadow dom bugs.

  - [`57a2e14`](https://github.com/rrweb-io/rrweb/commit/57a2e140ea419f7790b1672529f21dfe2261b52b) [#1088](https://github.com/rrweb-io/rrweb/pull/1088) Thanks [@mydea](https://github.com/mydea)! - Fix: Guard against missing window.CSSStyleSheet.

  - [`fc82869`](https://github.com/rrweb-io/rrweb/commit/fc828694099b87b4d811e6b651a7bb4c7499b896) [#1093](https://github.com/rrweb-io/rrweb/pull/1093) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: cross origin iframe bugs.

  - [`a77e302`](https://github.com/rrweb-io/rrweb/commit/a77e30217893e63f8025c73afc3ac1ba294d7761) [#1104](https://github.com/rrweb-io/rrweb/pull/1104) Thanks [@jlalmes](https://github.com/jlalmes)! - [console-plugin] Feat: Record unhandled rejection event.

  - [`25a4f5a`](https://github.com/rrweb-io/rrweb/commit/25a4f5ab6c7311f2e8e5e1a4d232c2820adf910e) [#1115](https://github.com/rrweb-io/rrweb/pull/1115) Thanks [@Juice10](https://github.com/Juice10)! - Fix: Don't trigger Finish event when in liveMode.

  - [`cb15800`](https://github.com/rrweb-io/rrweb/commit/cb1580008d04b0bc5c5d4ebec0e2e79899faaeb6) [#1106](https://github.com/rrweb-io/rrweb/pull/1106) Thanks [@mydea](https://github.com/mydea)! - Fix: Ensure CSS support is checked more robustly.

  - [`0732618`](https://github.com/rrweb-io/rrweb/commit/07326182f9750646771918481f116b946a17c2a9) [#1100](https://github.com/rrweb-io/rrweb/pull/1100) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: wrong rootId value in special iframes.

  - [`3caa25e`](https://github.com/rrweb-io/rrweb/commit/3caa25ed9b19954c98775f22d5fa47233fa3d1db) [#1098](https://github.com/rrweb-io/rrweb/pull/1098) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Refactor: Don't have requestAnimationFrame looping in background for Live Mode.

  - [`3a26e36`](https://github.com/rrweb-io/rrweb/commit/3a26e36f6f625c0391c7e6d3f1050660adfccc4f) [#1092](https://github.com/rrweb-io/rrweb/pull/1092) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: regression of issue: ShadowHost can't be a string (issue 941)

  - [`07d22e7`](https://github.com/rrweb-io/rrweb/commit/07d22e7cd999a48e7371aaef1b979574bb746500) [#1111](https://github.com/rrweb-io/rrweb/pull/1111) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Feat: enable to customize logger in the replayer.

  - [`0627d4d`](https://github.com/rrweb-io/rrweb/commit/0627d4df7cc76cde7babbd37ab8e3da5810fb51d) [#1109](https://github.com/rrweb-io/rrweb/pull/1109) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Feat: add option to record on DOMContentLoaded event.

  - [`174b9ac`](https://github.com/rrweb-io/rrweb/commit/174b9ac066565b8c065f40f0303189f10c7c4efb) [#1112](https://github.com/rrweb-io/rrweb/pull/1112) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: mutation Failed to execute 'insertBefore' on 'Node': Only one doctype on document allowed.

  - [`5a1e5e9`](https://github.com/rrweb-io/rrweb/commit/5a1e5e919e3f8bef48d142115c0afd5706a442b5) [#1119](https://github.com/rrweb-io/rrweb/pull/1119) Thanks [@Juice10](https://github.com/Juice10)! - Feat: Automate NPM package releases.

- Updated dependencies [[`1385f7a`](https://github.com/rrweb-io/rrweb/commit/1385f7acc0052f83be1458a7b00e18c026ee393f), [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff), [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff), [`3cc4323`](https://github.com/rrweb-io/rrweb/commit/3cc4323094065a12f8b65afecd45061d604e245f)]:
  - rrweb-snapshot@2.0.0-alpha.5
  - rrdom@2.0.0-alpha.5
  - @rrweb/types@2.0.0-alpha.5

## 2.0.0-alpha.4

### Major Changes

- [#1031](https://github.com/rrweb-io/rrweb/pull/1031) [`ad9bc3e`](https://github.com/rrweb-io/rrweb/commit/ad9bc3ed16d9172490bd8350c6922e3726a7f585) Thanks [@Juice10](https://github.com/Juice10)! - Move shared rrweb event and recorder types into the new `@rrweb/types` package.

### Minor Changes

- [#1035](https://github.com/rrweb-io/rrweb/pull/1035) [`2a80949`](https://github.com/rrweb-io/rrweb/commit/2a809499739ed2068bf6d9c614142f9dc8cb09ab) Thanks [@Juice10](https://github.com/Juice10)! - Add support for recording cross-origin iframes via `recordCrossOriginIframes`.

### Patch Changes

- [#1029](https://github.com/rrweb-io/rrweb/pull/1029) [`fdb7135`](https://github.com/rrweb-io/rrweb/commit/fdb7135fc6a13db4afddc5a25aa63c5c70f3d14b) Thanks [@Juice10](https://github.com/Juice10)! - Fix replaying element scroll positions when both `scrollTop` and `scrollLeft` are applied.

- [#1037](https://github.com/rrweb-io/rrweb/pull/1037) [`a9fffb3`](https://github.com/rrweb-io/rrweb/commit/a9fffb3b26960ca6476dc463094a26f926dd3b1c) Thanks [@QuentinLowe](https://github.com/QuentinLowe)! - Use the correct document when registering shadow roots inside iframes.

- [#1041](https://github.com/rrweb-io/rrweb/pull/1041) [`1990524`](https://github.com/rrweb-io/rrweb/commit/1990524ef2bf6aff7d488a1532d028f876c235b0) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix shadow DOM mutation handling that could enter an infinite loop on some pages.

- [#1034](https://github.com/rrweb-io/rrweb/pull/1034) [`5012b1e`](https://github.com/rrweb-io/rrweb/commit/5012b1eb57415fe350a6f599f9c16fbcf67ad145) Thanks [@wfk007](https://github.com/wfk007)! - Fix custom events and full snapshots after stopping and restarting recording.

- [#1020](https://github.com/rrweb-io/rrweb/pull/1020) [`7edfefe`](https://github.com/rrweb-io/rrweb/commit/7edfefe6a62c477a1ba9d9fe747a65c31c0e0ffb) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix recorder crashes when non-shadow-root nodes expose a `host` property.

- [#1016](https://github.com/rrweb-io/rrweb/pull/1016) [`87aa3b6`](https://github.com/rrweb-io/rrweb/commit/87aa3b6ad4c71285a9b002b8f523e6c8b7c14491) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Avoid recording noisy read-only WebGL properties such as `isContextLost`.

- [#1013](https://github.com/rrweb-io/rrweb/pull/1013) [`20ad416`](https://github.com/rrweb-io/rrweb/commit/20ad416d05a7532b75ccdcf88f044a8e592d4e12) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Fix WebGL variable tracking when multiple contexts are patched.

## 2.0.0-alpha.3

### Minor Changes

- [#989](https://github.com/rrweb-io/rrweb/pull/989) [`3809060`](https://github.com/rrweb-io/rrweb/commit/38090606b98e2d64073e74194d2c5c42453e8b5c) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Add support for recording and replaying constructable `adoptedStyleSheets`, including stylesheet mutations, `replace`/`replaceSync`, shadow roots, iframes, live mode, and virtual DOM replay.

### Patch Changes

- [#1012](https://github.com/rrweb-io/rrweb/pull/1012) [`6f44bb7`](https://github.com/rrweb-io/rrweb/commit/6f44bb72794118cf38e7ac87c76326ded9d9c409) Thanks [@Juice10](https://github.com/Juice10)! - Ensure replay plugin `onBuild` hooks run for newly appended mutation nodes and top-level rebuilt document nodes.

- [#995](https://github.com/rrweb-io/rrweb/pull/995) [`55ebce7`](https://github.com/rrweb-io/rrweb/commit/55ebce733393da99b01e786f9bc77bf5362ba828) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix replay of delayed inlined stylesheet links by updating the existing link/style node attributes instead of adding a child node.

## 2.0.0-alpha.2

### Minor Changes

- [#936](https://github.com/rrweb-io/rrweb/pull/936) [`b2d5689`](https://github.com/rrweb-io/rrweb/commit/b2d5689864eff62c80c4439e9a4e4f0f6983b1f5) Thanks [@0jinxing](https://github.com/0jinxing)! - Add recording and replay support for text selection events.

- [#953](https://github.com/rrweb-io/rrweb/pull/953) [`5f59f91`](https://github.com/rrweb-io/rrweb/commit/5f59f917765ff87ad9a6e4342c910057b4f9a31a) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Add a `destroy()` method to fully remove a replayer instance and emit a destroy event.

- [#976](https://github.com/rrweb-io/rrweb/pull/976) [`a8478f1`](https://github.com/rrweb-io/rrweb/commit/a8478f1dd7613a08d5f15d176d6e555497f83e0d) Thanks [@Juice10](https://github.com/Juice10)! - Add canvas WebRTC record and replay plugins for live-streaming canvas contents.

- [#1000](https://github.com/rrweb-io/rrweb/pull/1000) [`ce6019d`](https://github.com/rrweb-io/rrweb/commit/ce6019d2d6264ac8ef4cc0c5f8ff1733787f9ea0) Thanks [@wfk007](https://github.com/wfk007)! - Add support for recording and replaying media `playbackRate` changes.

- [#967](https://github.com/rrweb-io/rrweb/pull/967) [`bac1d7b`](https://github.com/rrweb-io/rrweb/commit/bac1d7b0cbfcf1157476c49b4b12e178aab7fc94) Thanks [@QxQstar](https://github.com/QxQstar)! - Add `dataURLOptions` to control canvas snapshot image format and quality.

- [#894](https://github.com/rrweb-io/rrweb/pull/894) [`5ba933c`](https://github.com/rrweb-io/rrweb/commit/5ba933ccdb8b51dfc067319d418dbadd2f7642db) Thanks [@dbseel](https://github.com/dbseel)! - Add `ignoreCSSAttributes` and apply `blockSelector` checks consistently across recorder observers.

### Patch Changes

- [#927](https://github.com/rrweb-io/rrweb/pull/927) [`fd85c79`](https://github.com/rrweb-io/rrweb/commit/fd85c79e853ef89a860e795a8ae3ba318ef42ae8) Thanks [@Juice10](https://github.com/Juice10)! - Fix iframe reload and rrdom diff issues by handling negative and unserialized node ids correctly.

- [#952](https://github.com/rrweb-io/rrweb/pull/952) [`a0d5373`](https://github.com/rrweb-io/rrweb/commit/a0d537385fb90776a4987ed52130e8a9d5983694) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix errors when replaying selection events during fast-forward playback.

- [#966](https://github.com/rrweb-io/rrweb/pull/966) [`ac7935e`](https://github.com/rrweb-io/rrweb/commit/ac7935e39d98a8d004a658451a1fd821a45b1edc) Thanks [@QxQstar](https://github.com/QxQstar)! - Fix FPS-based canvas recording when `blockClass` is a regular expression.

- [#956](https://github.com/rrweb-io/rrweb/pull/956) [`e7fdf53`](https://github.com/rrweb-io/rrweb/commit/e7fdf533611ed7f34d7aef70f928710a64840302) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix recording of multiple children inside a shadow root.

- [#991](https://github.com/rrweb-io/rrweb/pull/991) [`7be26b0`](https://github.com/rrweb-io/rrweb/commit/7be26b07a269e66bda3f13dfb06ba548910b4f77) Thanks [@QuentinLowe](https://github.com/QuentinLowe)! - Fix input hooks inside iframes by using the iframe document's own window prototypes.

- [#998](https://github.com/rrweb-io/rrweb/pull/998) [`49d143f`](https://github.com/rrweb-io/rrweb/commit/49d143f7ac0c641a6d820082b6dd50a2c0500b4d) Thanks [@dbseel](https://github.com/dbseel)! - Fix replay timing for mouse move events with empty or missing positions.

- [#962](https://github.com/rrweb-io/rrweb/pull/962) [`6007266`](https://github.com/rrweb-io/rrweb/commit/60072666c5b7c6b0c197ac3ac025d52d92b6c084) Thanks [@wfk007](https://github.com/wfk007)! - Fix recorder restart behavior by resetting internal record functions when recording stops.

- [#1002](https://github.com/rrweb-io/rrweb/pull/1002) [`96b7466`](https://github.com/rrweb-io/rrweb/commit/96b746645e9d9cc00c1a4c9e0bf6e1771236524e) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix duplicate shadow DOM recording by avoiding repeated observation of the same shadow root.

- [#1003](https://github.com/rrweb-io/rrweb/pull/1003) [`08ab7ab`](https://github.com/rrweb-io/rrweb/commit/08ab7ab4c7e4def750d159f3950218c87817d177) Thanks [@Juice10](https://github.com/Juice10)! - Fix live mode timer setup to reuse the configured speed and live mode settings.

- [#1001](https://github.com/rrweb-io/rrweb/pull/1001) [`c619a59`](https://github.com/rrweb-io/rrweb/commit/c619a59df8126640cd1f9021ec3f65174d0629b7) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Fix `addAction` so replay actions added after timer startup take effect without stopping and restarting.

## 2.0.0-alpha.1

### Patch Changes

- [#938](https://github.com/rrweb-io/rrweb/pull/938) [`f3064c1`](https://github.com/rrweb-io/rrweb/commit/f3064c1f09f748a00c28a284a4b9dbead2f699dd) Thanks [@lele0108](https://github.com/lele0108)! - Fix SVG `<use href="#...">` snapshot serialization so local fragment references are preserved instead of converted to absolute URLs.

- [#935](https://github.com/rrweb-io/rrweb/pull/935) [`8ad4325`](https://github.com/rrweb-io/rrweb/commit/8ad43254af39326fdbd510d4df8061c5f4d38d3e) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix console plugin recording so `undefined` values are serialized and replay correctly.

- [#942](https://github.com/rrweb-io/rrweb/pull/942) [`f03504a`](https://github.com/rrweb-io/rrweb/commit/f03504a7af09926fcf9e06a50130eb03deea015a) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix recording and replay of polyfilled Shadow DOM from ShadyDOM and `@lwc/synthetic-shadow`.

- [#944](https://github.com/rrweb-io/rrweb/pull/944) [`f1b23dd`](https://github.com/rrweb-io/rrweb/commit/f1b23ddc714ebaf9b66ca7a913f740e2c0524868) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix fast-forward replay so canvas image data inside iframes is restored when rebuilding through the virtual DOM path.

## 2.0.0-alpha.0

### Major Changes

- [#868](https://github.com/rrweb-io/rrweb/pull/868) [`e4f680e`](https://github.com/rrweb-io/rrweb/commit/e4f680e8f52210596cd68d17f8d54eb8a0d8e65c) Thanks [@Juice10](https://github.com/Juice10)! - Remove `INode` / `node.__sn` usage and use `Mirror` as the source of truth.

- [#913](https://github.com/rrweb-io/rrweb/pull/913) [`74f553a`](https://github.com/rrweb-io/rrweb/commit/74f553af9241c32a028ee60335a640b3ea2a27d5) Thanks [@Yuyz0112](https://github.com/Yuyz0112)! - Move browser-only rrdom features into the new `rrdom` package.

### Minor Changes

- [#859](https://github.com/rrweb-io/rrweb/pull/859) [`e238462`](https://github.com/rrweb-io/rrweb/commit/e238462f3aff10b0242a4aef729065b7b9c8e7a1) Thanks [@Juice10](https://github.com/Juice10)! - Add support for recording canvas snapshots at a configured FPS.

- [#895](https://github.com/rrweb-io/rrweb/pull/895) [`de755ae`](https://github.com/rrweb-io/rrweb/commit/de755ae572c04131f74f251b06da6de648b112c4) Thanks [@Juice10](https://github.com/Juice10)! - Add the fast-forward virtual DOM optimization for replay.

### Patch Changes

- [#867](https://github.com/rrweb-io/rrweb/pull/867) [`93fec1f`](https://github.com/rrweb-io/rrweb/commit/93fec1f3c4c81ca9b7ce627ab6a8d1bdd6106f68) Thanks [@rahulrelicx](https://github.com/rahulrelicx)! - Fix a mutation edge case when a blocked element class is later unblocked.

- [#891](https://github.com/rrweb-io/rrweb/pull/891) [`3cdcb8a`](https://github.com/rrweb-io/rrweb/commit/3cdcb8a1851d61eecfe3330f1a38fc7338380fcd) Thanks [@dkozlovskyi](https://github.com/dkozlovskyi)! - Fix issue #890 in replay/recording behavior.

- [#885](https://github.com/rrweb-io/rrweb/pull/885) [`69499be`](https://github.com/rrweb-io/rrweb/commit/69499be6d7cd1916599a3ca4f3d04f893bc9d289) Thanks [@Juice10](https://github.com/Juice10)! - Apply only the latest queued text mutation for better replay behavior and performance.

- [#903](https://github.com/rrweb-io/rrweb/pull/903) [`058c457`](https://github.com/rrweb-io/rrweb/commit/058c4579530414f6e55434fb28f9227443ed3b6d) Thanks [@Juice10](https://github.com/Juice10)! - Speed up snapshotting of many newly added DOM nodes.

- [#909](https://github.com/rrweb-io/rrweb/pull/909) [`d5d877e`](https://github.com/rrweb-io/rrweb/commit/d5d877e3c19364784abf08f6e3eea4ba911fe4e3) Thanks [@Juice10](https://github.com/Juice10)! - Inline stylesheets when they load so late stylesheet content is captured.
