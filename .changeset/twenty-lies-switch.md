---
'rrweb-snapshot': patch
'@rrweb/types': patch
'rrdom': patch
'rrdom-nodejs': patch
'rrweb': patch
'rrweb-player': patch
---

Add missing change logs manually. In the next version, all change logs will be generated automatically.

- [`a220835`](https://github.com/rrweb-io/rrweb/commit/a220835eeb81ca4f294682e060d46c8853720d7f) [#1053](https://github.com/rrweb-io/rrweb/pull/1053) Thanks [@Juice10](https://github.com/Juice10)! - Fix: Post message can break cross origin iframe recording.

- [`7e8dcdb`](https://github.com/rrweb-io/rrweb/commit/7e8dcdb11dc5dfefcdd19ff5e13ec9d8b5c24dcc) [#1063](https://github.com/rrweb-io/rrweb/pull/1063) Thanks [@lele0108](https://github.com/lele0108)! - Fix: muted false -> true not being set.

- [`b655361`](https://github.com/rrweb-io/rrweb/commit/b655361a5f0d50a053fcd0e5c823b8494c33b89c) [#1067](https://github.com/rrweb-io/rrweb/pull/1067) Thanks [@mydea](https://github.com/mydea)! - Export recordOptions type.

- [`36b44e1`](https://github.com/rrweb-io/rrweb/commit/36b44e104b91fc74c3e69684111240cd23105340) [#1042](https://github.com/rrweb-io/rrweb/pull/1042) Thanks [@wfk007](https://github.com/wfk007)! - Fix: Failed to execute insertBefore on Node.

- [`44e92cb`](https://github.com/rrweb-io/rrweb/commit/44e92cbff981c36e754dfcb9a184eae9e7292ecf) [#1058](https://github.com/rrweb-io/rrweb/pull/1058) Thanks [@mydea](https://github.com/mydea)! - Handle errors when observing iframes.

- [`729b8bf`](https://github.com/rrweb-io/rrweb/commit/729b8bf38c8c7f2e1b22b4e0f7cab14f0807bc74) [#1083](https://github.com/rrweb-io/rrweb/pull/1083) Thanks [@Juice10](https://github.com/Juice10)! - Fix: Catch iframe manager & fix formatting issues.

- [`03821d9`](https://github.com/rrweb-io/rrweb/commit/03821d9b9fa0513e6e373881d43102ceb9388340) [#1083](https://github.com/rrweb-io/rrweb/pull/1083) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Harmonize on a single getWindowScroll

- [`fe69bd6`](https://github.com/rrweb-io/rrweb/commit/fe69bd6456cead304bfc77cf72c9db0f8c030842) [#1087](https://github.com/rrweb-io/rrweb/pull/1087) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Refactor all suffix of bundled scripts with commonjs module from 'js' to cjs.

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

- [`4ee86fe`](https://github.com/rrweb-io/rrweb/commit/4ee86fe66d3e1fe7071f9c8764d82a6fa5c71d57) [#1091](https://github.com/rrweb-io/rrweb/pull/1091) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: improve rrdom robustness.

- [`07d22e7`](https://github.com/rrweb-io/rrweb/commit/07d22e7cd999a48e7371aaef1b979574bb746500) [#1111](https://github.com/rrweb-io/rrweb/pull/1111) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Feat: enable to customize logger in the replayer.

- [`0627d4d`](https://github.com/rrweb-io/rrweb/commit/0627d4df7cc76cde7babbd37ab8e3da5810fb51d) [#1109](https://github.com/rrweb-io/rrweb/pull/1109) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Feat: add option to record on DOMContentLoaded event.

- [`174b9ac`](https://github.com/rrweb-io/rrweb/commit/174b9ac066565b8c065f40f0303189f10c7c4efb) [#1112](https://github.com/rrweb-io/rrweb/pull/1112) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix: mutation Failed to execute 'insertBefore' on 'Node': Only one doctype on document allowed.

- [`5a1e5e9`](https://github.com/rrweb-io/rrweb/commit/5a1e5e919e3f8bef48d142115c0afd5706a442b5) [#1119](https://github.com/rrweb-io/rrweb/pull/1119) Thanks [@Juice10](https://github.com/Juice10)! - Feat: Automate NPM package releases.
