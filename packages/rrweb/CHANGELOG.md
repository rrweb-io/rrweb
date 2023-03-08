# rrweb

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
