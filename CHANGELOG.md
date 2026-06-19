# Changelog

## [2.0.0-grafana.1](https://github.com/grafana/rrweb/compare/v2.0.0-grafana.0...v2.0.0-grafana.1) (2026-06-19)


### Features

* Add `ignoreSelector` option ([#1262](https://github.com/grafana/rrweb/issues/1262)) ([36da39d](https://github.com/grafana/rrweb/commit/36da39db366a9f80c28549771ed331090a1c6647))
* add a destroy function to destroy the whole player ([#953](https://github.com/grafana/rrweb/issues/953)) ([5f59f91](https://github.com/grafana/rrweb/commit/5f59f9171e481c78d08a1008186cff31a40ee199))
* add CI for publishing chrome extension ([#1568](https://github.com/grafana/rrweb/issues/1568)) ([4fd55c0](https://github.com/grafana/rrweb/commit/4fd55c0669df955001cbd362582c6bce179d7250))
* add dataURLOptions parameter control canvas image format and quality ([#967](https://github.com/grafana/rrweb/issues/967)) ([bac1d7b](https://github.com/grafana/rrweb/commit/bac1d7b0484e4f1083ad4ff8844d526ddaf6cf82))
* add new css parser - postcss ([#1458](https://github.com/grafana/rrweb/issues/1458)) ([89ae4d2](https://github.com/grafana/rrweb/commit/89ae4d2bad264dc7fcade98fe813872a8cd8342b))
* add observer for 'selected' setter of HTMLOptionElement and try to fix issue [#746](https://github.com/grafana/rrweb/issues/746) ([#810](https://github.com/grafana/rrweb/issues/810)) ([156b760](https://github.com/grafana/rrweb/commit/156b760a3373a09e07bccb321fd27e09b1444435))
* add support for recording and replaying adoptedStyleSheets API ([#989](https://github.com/grafana/rrweb/issues/989)) ([3809060](https://github.com/grafana/rrweb/commit/38090606847007ffec0a78d3aeffd9b9783f9914))
* Add support for replaying :defined pseudo-class of custom elements ([#1155](https://github.com/grafana/rrweb/issues/1155)) ([8aea5b0](https://github.com/grafana/rrweb/commit/8aea5b00a4dfe5a6f59bd2ae72bb624f45e51e81))
* Added support maskInputFn with HTMLElement ([#1188](https://github.com/grafana/rrweb/issues/1188)) ([bc84246](https://github.com/grafana/rrweb/commit/bc84246f78849a80dbb8fe9b4e76117afcc5c3f7))
* Allow to pass `errorHandler` as record option ([#1107](https://github.com/grafana/rrweb/issues/1107)) ([a225d8e](https://github.com/grafana/rrweb/commit/a225d8e1412a69a761c22eb45565fff0b0ce5c11))
* Ensure password inputs are masked when switching type ([#1170](https://github.com/grafana/rrweb/issues/1170)) ([d2582e9](https://github.com/grafana/rrweb/commit/d2582e9a81197130cd93bc1dd778e16fddfb0be3))
* Guard against missing `window.CSSStyleSheet` ([#1088](https://github.com/grafana/rrweb/issues/1088)) ([57a2e14](https://github.com/grafana/rrweb/commit/57a2e140ea419f7790b1672529f21dfe2261b52b))
* Ignore `autoplay` attribute on video/audio elements ([#1152](https://github.com/grafana/rrweb/issues/1152)) ([eac9b18](https://github.com/grafana/rrweb/commit/eac9b18bbfa3c350797b99b583dd93a5fc32b828))
* support media playbackRate ([#1000](https://github.com/grafana/rrweb/issues/1000)) ([ce6019d](https://github.com/grafana/rrweb/commit/ce6019d274d63e4e4b53b6aaa999004d43b0d2d1))


### Bug Fixes

* 698, replay scroll on iframe document ([78526a3](https://github.com/grafana/rrweb/commit/78526a3aae6ba35016ad2836477ba3186eacf250))
* 783 ([#785](https://github.com/grafana/rrweb/issues/785)) ([88d3ac1](https://github.com/grafana/rrweb/commit/88d3ac152ce5fd12e1c3a41c9e724548186e1d77))
* 811 expose inlineImages to record ([661c746](https://github.com/grafana/rrweb/commit/661c746b14373dc3c360b2f6ce3e604e33887678))
* 864 use for loop instead of forEach ([423372b](https://github.com/grafana/rrweb/commit/423372b0c434a51c268ded4837234c91ad3be4be))
* 904 ([#906](https://github.com/grafana/rrweb/issues/906)) ([9da1e43](https://github.com/grafana/rrweb/commit/9da1e432cc68b05bd97547398628346faa912f45))
* 972 [Docs]: Add Readme.md to packages/rrweb ([#1025](https://github.com/grafana/rrweb/issues/1025)) ([ae643f4](https://github.com/grafana/rrweb/commit/ae643f4c4865a9c2c1c3056e54721208582a5317))
* add mutation lost in slimDOMOptions ([#994](https://github.com/grafana/rrweb/issues/994)) ([a9a2559](https://github.com/grafana/rrweb/commit/a9a255931f82a9b311d9385ac081337ccaf59512))
* address security risks in GitHub Actions workflows ([#1651](https://github.com/grafana/rrweb/issues/1651)) ([dfb2991](https://github.com/grafana/rrweb/commit/dfb2991055f5910ad92e1d462a09be2386bd6892))
* all tiers of sponsors are displayed under the 'gold sponsor' level ([#1210](https://github.com/grafana/rrweb/issues/1210)) ([751d3c7](https://github.com/grafana/rrweb/commit/751d3c78f567ae128a504cdca2ed0d30e35e8686))
* an error when I stop the recording process ([#828](https://github.com/grafana/rrweb/issues/828)) ([d192b40](https://github.com/grafana/rrweb/commit/d192b405ea48b5734cd7ded2c7dbebddfe5fc469))
* angular wrapped mutationobserver detection ([#1597](https://github.com/grafana/rrweb/issues/1597)) ([bd9eb70](https://github.com/grafana/rrweb/commit/bd9eb70629aeb5970f6188025f184ff4b0d5dcd4))
* bug when handling shadow doms ([#1041](https://github.com/grafana/rrweb/issues/1041)) ([1990524](https://github.com/grafana/rrweb/commit/1990524ebb87a8eda05b251568eea9274ef1506a))
* can't record shadow root's children except the last one ([#956](https://github.com/grafana/rrweb/issues/956)) ([e7fdf53](https://github.com/grafana/rrweb/commit/e7fdf533666a2ea9defb021ad33b45e3f238e8af))
* can't record SVG element inside iframe properly ([#843](https://github.com/grafana/rrweb/issues/843)) ([e9531d4](https://github.com/grafana/rrweb/commit/e9531d420a406e0f5b4d0157ff8ffdb7c178eff4))
* Cannot set property attributeName of #&lt;MutationRecord&gt; which has only a getter ([#1173](https://github.com/grafana/rrweb/issues/1173)) ([5982c89](https://github.com/grafana/rrweb/commit/5982c8972a66e319ba33a1fb2c37fc91cb4e01c4))
* canvas data in iframe wasn't applied in the fast-forward mode ([#944](https://github.com/grafana/rrweb/issues/944)) ([f1b23dd](https://github.com/grafana/rrweb/commit/f1b23ddcccb1e1990b570abb8650afb95d4250db))
* Capture css `background-clip: text` with browser prefix ([#1047](https://github.com/grafana/rrweb/issues/1047)) ([9bbc3e0](https://github.com/grafana/rrweb/commit/9bbc3e007334dc9ba712fd41cb4ffc0a73b54949))
* Catch iframe manager & fix formatting issues ([#1083](https://github.com/grafana/rrweb/issues/1083)) ([729b8bf](https://github.com/grafana/rrweb/commit/729b8bf38c8c7f2e1b22b4e0f7cab14f0807bc74))
* change default value of input type from null to text ([#1200](https://github.com/grafana/rrweb/issues/1200)) ([94d0653](https://github.com/grafana/rrweb/commit/94d06536e35cee6f5e10aebdea402ff994c76197))
* CI hangs forever in the yarn [4/4] Building fresh packages... ([#1696](https://github.com/grafana/rrweb/issues/1696)) ([4db9782](https://github.com/grafana/rrweb/commit/4db9782d1278a2b7235ed48162ccedf0e0952113))
* **ci:** fix browser setup to prevent Playwright install hangs ([#38](https://github.com/grafana/rrweb/issues/38)) ([dc3f6ce](https://github.com/grafana/rrweb/commit/dc3f6cef3d48cec8df1247e3ca15d91f0023824d))
* **ci:** use grafana-session-replay-bot for release workflow ([#34](https://github.com/grafana/rrweb/issues/34)) ([f55d0be](https://github.com/grafana/rrweb/commit/f55d0bec1441b3359b0ca29ebe590c6fd29692e0))
* console assert only logs when arg 0 is falsy ([#1530](https://github.com/grafana/rrweb/issues/1530)) ([874933b](https://github.com/grafana/rrweb/commit/874933b55069759b932b3365025449afc9b2f5c7))
* console logger can serialize bigint values ([#1403](https://github.com/grafana/rrweb/issues/1403)) ([af0962c](https://github.com/grafana/rrweb/commit/af0962cc6c80b693bbc622520032d17342685cf6))
* createImageBitmap throws DOMException if source is 0 ([#1422](https://github.com/grafana/rrweb/issues/1422)) ([3d1877c](https://github.com/grafana/rrweb/commit/3d1877cff83d9a018630674fb6e730050ceef812))
* custom style rules don't get inserted into some iframe elements ([#823](https://github.com/grafana/rrweb/issues/823)) ([5ec7d9e](https://github.com/grafana/rrweb/commit/5ec7d9e740010efc443337cbad6905c6cb3c6920))
* doc fix canvas-webrtc link ([#1193](https://github.com/grafana/rrweb/issues/1193)) ([d7beb11](https://github.com/grafana/rrweb/commit/d7beb11ca3c956dff06cc5ca4df519f920c4a4fa))
* duplicate textContent for style element cause incremental style mutation invalid ([#1417](https://github.com/grafana/rrweb/issues/1417)) ([40bbc25](https://github.com/grafana/rrweb/commit/40bbc25fc287badc317a53f2d3f21b1c9f2b211b))
* Ensure attributes are lowercased when checking ([#1183](https://github.com/grafana/rrweb/issues/1183)) ([d7c72bf](https://github.com/grafana/rrweb/commit/d7c72bff0724b46a6fa94af455220626a27104fe))
* Ensure CSS support is checked more robustly ([#1106](https://github.com/grafana/rrweb/issues/1106)) ([cb15800](https://github.com/grafana/rrweb/commit/cb1580008d04b0bc5c5d4ebec0e2e79899faaeb6))
* ensure empty string replace/replaceSync clears stylesheets ([#1774](https://github.com/grafana/rrweb/issues/1774)) ([ad5ac17](https://github.com/grafana/rrweb/commit/ad5ac17422f4cbc450915c5dd6e0c0b0eb6c13a6))
* errors when fast-forward selection events ([#952](https://github.com/grafana/rrweb/issues/952)) ([a0d5373](https://github.com/grafana/rrweb/commit/a0d53738f88793fcf088897a5ba6da40ea706ef2))
* eslint action error in a PR from a fork repo ([#943](https://github.com/grafana/rrweb/issues/943)) ([df9d5bb](https://github.com/grafana/rrweb/commit/df9d5bb02c24ea7fa0e5b0d3c70cb2bf2786283f))
* Exclude scripts loaded with `rel=modulepreload` from snapshots ([#1128](https://github.com/grafana/rrweb/issues/1128)) ([b540c04](https://github.com/grafana/rrweb/commit/b540c047c2a514db65eb3e61d3b211d652af7914))
* Explicitly handle `null` attribute values ([#1157](https://github.com/grafana/rrweb/issues/1157)) ([8e47ca1](https://github.com/grafana/rrweb/commit/8e47ca1021ebb4fc036b37623ef10abf7976d6dd))
* extension doesn't work after vite bump ([#1507](https://github.com/grafana/rrweb/issues/1507)) ([4beaf2d](https://github.com/grafana/rrweb/commit/4beaf2d12a53fbf4c97b690927adb82737f18850))
* Failed to execute insertBefore on Node ([#1042](https://github.com/grafana/rrweb/issues/1042)) ([36b44e1](https://github.com/grafana/rrweb/commit/36b44e104b91fc74c3e69684111240cd23105340))
* Fix checking for `patchTarget` in `initAdoptedStyleSheetObserver` ([#1327](https://github.com/grafana/rrweb/issues/1327)) ([57a940a](https://github.com/grafana/rrweb/commit/57a940afac0bdd14cd82937915d53110b5311673))
* fix console plugin's OOM problem ([#656](https://github.com/grafana/rrweb/issues/656)) ([8d40e52](https://github.com/grafana/rrweb/commit/8d40e52010f9e1986bbc29620e04054e99a87178))
* Fix CSS rules captured in Safari ([#1253](https://github.com/grafana/rrweb/issues/1253)) ([c6600e7](https://github.com/grafana/rrweb/commit/c6600e742b8ec0b6295816bb5de9edcd624d975e))
* Fix input.type check ([#1184](https://github.com/grafana/rrweb/issues/1184)) ([aa79db7](https://github.com/grafana/rrweb/commit/aa79db7568578ea3a413292450cd64f07481e5dd))
* Handle case where `event` is null/undefined ([#1254](https://github.com/grafana/rrweb/issues/1254)) ([d0fbe23](https://github.com/grafana/rrweb/commit/d0fbe23c632021410a6dd45f9028a9a012467261))
* if handleProgressClick invoked after finished, start from where user clicked ([#727](https://github.com/grafana/rrweb/issues/727)) ([e9405c5](https://github.com/grafana/rrweb/commit/e9405c560a96985fc6db8bcc4d5993125a001a6e))
* iframe input hook ([#991](https://github.com/grafana/rrweb/issues/991)) ([7be26b0](https://github.com/grafana/rrweb/commit/7be26b07eb22bf39412175c1942b7a9be137881f))
* Iframe replay fails after the second full snapshot [#983](https://github.com/grafana/rrweb/issues/983) ([#984](https://github.com/grafana/rrweb/issues/984)) ([6eaec04](https://github.com/grafana/rrweb/commit/6eaec0424d3df346987da4b3279d2ca574ce3998))
* improve nested CSS rule handling and add related tests ([#1775](https://github.com/grafana/rrweb/issues/1775)) ([b149cf3](https://github.com/grafana/rrweb/commit/b149cf31ed28cac7b6627972b423d29723524d87))
* inline images onload ([#1174](https://github.com/grafana/rrweb/issues/1174)) ([e7f0c80](https://github.com/grafana/rrweb/commit/e7f0c808c3f348fb27d1acd5fa300a5d92b14d00))
* isBlocked throws on invalid HTML element ([#1032](https://github.com/grafana/rrweb/issues/1032)) ([66abe17](https://github.com/grafana/rrweb/commit/66abe17832dbb23b3948af1c394f9a02caccc17b))
* isCheckout is not included in fullsnapshot event ([#1141](https://github.com/grafana/rrweb/issues/1141)) ([3416c3a](https://github.com/grafana/rrweb/commit/3416c3a769e2bd2ddfbb88f5c4ff139871c567be))
* module error ([#1087](https://github.com/grafana/rrweb/issues/1087)) ([fe69bd6](https://github.com/grafana/rrweb/commit/fe69bd6456cead304bfc77cf72c9db0f8c030842))
* move patch function into utils to improve bundling ([#1631](https://github.com/grafana/rrweb/issues/1631)) ([88ea2d0](https://github.com/grafana/rrweb/commit/88ea2d05c1869026111c91f7aa14ea7a7193fcd8))
* mutation Failed to execute 'insertBefore' on 'Node': Only one doctype on document allowed ([#1112](https://github.com/grafana/rrweb/issues/1112)) ([174b9ac](https://github.com/grafana/rrweb/commit/174b9ac066565b8c065f40f0303189f10c7c4efb))
* nested stylesheets should have absolute URLs ([#1533](https://github.com/grafana/rrweb/issues/1533)) ([d350da8](https://github.com/grafana/rrweb/commit/d350da8552d8616dd118ee550bdfbce082986562))
* outdated ':hover' styles can't be removed from iframes or shadow doms ([#1121](https://github.com/grafana/rrweb/issues/1121)) ([502d15d](https://github.com/grafana/rrweb/commit/502d15df9f7f43b3408ccfbb3f14c4bb007883c4))
* post bundle size comments for fork prs ([#1836](https://github.com/grafana/rrweb/issues/1836)) ([055a6b3](https://github.com/grafana/rrweb/commit/055a6b3cddcd0ea2ad041c5d2f965cfa91ecbbf5))
* Post message can break cross origin iframe recording ([#1053](https://github.com/grafana/rrweb/issues/1053)) ([a220835](https://github.com/grafana/rrweb/commit/a220835eeb81ca4f294682e060d46c8853720d7f))
* processed-node-manager is created even in the environment that doesn't need a recorder ([#1186](https://github.com/grafana/rrweb/issues/1186)) ([267e990](https://github.com/grafana/rrweb/commit/267e990dc0e45a5acaaa3ee89db7ae9171520d54))
* record canvas by fps when blockClass is RegExp ([#966](https://github.com/grafana/rrweb/issues/966)) ([ac7935e](https://github.com/grafana/rrweb/commit/ac7935e378f09fb51375b903a3b98117d2766697))
* recording bug in youtube and bitbucket ([#1020](https://github.com/grafana/rrweb/issues/1020)) ([7edfefe](https://github.com/grafana/rrweb/commit/7edfefe680d6710f653f458e555ec8b9d9140566))
* Recursive logging bug with console recording ([#1136](https://github.com/grafana/rrweb/issues/1136)) ([aaabdbd](https://github.com/grafana/rrweb/commit/aaabdbdff5df2abd1a294c40ed89e74bf8b2ec7c))
* regression of issue: ShadowHost can't be a string (issue 941) ([#1092](https://github.com/grafana/rrweb/issues/1092)) ([3a26e36](https://github.com/grafana/rrweb/commit/3a26e36f6f625c0391c7e6d3f1050660adfccc4f))
* remote CSS does not get rebuilt properly ([#1618](https://github.com/grafana/rrweb/issues/1618)) ([79837ac](https://github.com/grafana/rrweb/commit/79837ac8f2f459935f6737210890b5c12033a53b))
* reset fns when when stopping record ([#962](https://github.com/grafana/rrweb/issues/962)) ([6007266](https://github.com/grafana/rrweb/commit/60072666d7512bd17e868ac78e6bbeb1942fd477))
* Resize and MediaInteraction events repeat generated after the iframe appeared ([#1251](https://github.com/grafana/rrweb/issues/1251)) ([bbbfa22](https://github.com/grafana/rrweb/commit/bbbfa226fc5882a01ecc1607b713f0caf797775e))
* **rrdom:** Ignore invalid DOM attributes when diffing ([#1561](https://github.com/grafana/rrweb/issues/1561)) ([8e55c45](https://github.com/grafana/rrweb/commit/8e55c455ff2987a3b5f367f23f48c1f2de74ce45))
* Rrror parser throw ([#1225](https://github.com/grafana/rrweb/issues/1225)) ([4dcdcf7](https://github.com/grafana/rrweb/commit/4dcdcf7ec448758a9f7e49df4a8e1d8e46f5ca43))
* rrweb recorder may throw error when stopping recording after an iframe becomes cross-origin ([#1695](https://github.com/grafana/rrweb/issues/1695)) ([fc390a9](https://github.com/grafana/rrweb/commit/fc390a954c4fc17fe2ee0e2b6edba634611349e0))
* **rrweb-snapshot:** don't exclude [@import](https://github.com/import) CSS rules from the output and use CSSRule.cssText instead when they throw an exception while accessing their CSSStyleSheet.cssRules property ([#720](https://github.com/grafana/rrweb/issues/720)) ([4ff6e41](https://github.com/grafana/rrweb/commit/4ff6e41877b9d0d4a3f6ddc1fc8ed9711c48a5ee))
* scrolling can be incorrect when fast-forwarding ([#1352](https://github.com/grafana/rrweb/issues/1352)) ([e607e83](https://github.com/grafana/rrweb/commit/e607e83b21d45131a56c1ff606e9519a5b475fc1))
* scrolling on elements being is ignored ([#1029](https://github.com/grafana/rrweb/issues/1029)) ([fdb7135](https://github.com/grafana/rrweb/commit/fdb7135fbeddc4b4ddcb4711f028a1a3a2852ca5))
* Set finished=false in goto instead of handleProgressClick ([#1198](https://github.com/grafana/rrweb/issues/1198)) ([b5e30cf](https://github.com/grafana/rrweb/commit/b5e30cf6cc7f5335d674ef1917a92bdf2895fe9e))
* shadow dom bugs ([#1049](https://github.com/grafana/rrweb/issues/1049)) ([07aa1b2](https://github.com/grafana/rrweb/commit/07aa1b2807da5a9a1db678ebc3ff59320a300d06))
* **snapshot:** dimensions for blocked element not being applied ([#1331](https://github.com/grafana/rrweb/issues/1331)) ([02cc62d](https://github.com/grafana/rrweb/commit/02cc62dd44b52f579a332b55c49896a5cb7cc694))
* some nested cross-origin iframes can't be recorded ([#1353](https://github.com/grafana/rrweb/issues/1353)) ([5c27b76](https://github.com/grafana/rrweb/commit/5c27b763192bda9dd91806f95df7c1cd0ab083a6))
* Switch to real dom before rebuilding fullsnapshot ([#1139](https://github.com/grafana/rrweb/issues/1139)) ([f27e545](https://github.com/grafana/rrweb/commit/f27e545e1871ed2c1753d37543f556e8ddc406b4))
* Trigger mouse movement & hover with mouse up/down in sync mode ([#1191](https://github.com/grafana/rrweb/issues/1191)) ([1e6f71b](https://github.com/grafana/rrweb/commit/1e6f71b3cddcfafe78b9e40edfbd75e485702e4e))
* Uncaught TypeError: Illegal invocation when recording incremental canvas mutation ([#844](https://github.com/grafana/rrweb/issues/844)) ([5ae208b](https://github.com/grafana/rrweb/commit/5ae208b17479c52e46b3bffd592dc232e851dfa7))
* update default branch references from master to main ([#27](https://github.com/grafana/rrweb/issues/27)) ([c8564cd](https://github.com/grafana/rrweb/commit/c8564cda8f66faed81f455e3f9f4b716613fbe7b))
* Validate if WebGLRenderingContext exists before capturing it ([#1777](https://github.com/grafana/rrweb/issues/1777)) ([3b8daa6](https://github.com/grafana/rrweb/commit/3b8daa6034414dcb74877fb42cea720949e89549))
* **web-extension:** beforeunload logic ([#1330](https://github.com/grafana/rrweb/issues/1330)) ([9e65dda](https://github.com/grafana/rrweb/commit/9e65dda258c9b8169a4a6486b5c018f42f6c512a))
* **web-extension:** Fix types in vite config ([#1333](https://github.com/grafana/rrweb/issues/1333)) ([40f484d](https://github.com/grafana/rrweb/commit/40f484d088390b480f088d1b1c1c152641cd5878))
* worker_thread warning ([#1179](https://github.com/grafana/rrweb/issues/1179)) ([e0f862b](https://github.com/grafana/rrweb/commit/e0f862bac7dbaa9cfd778f5ef0f5f3fd8cbe6def))
* wrappedEmit is not a function ([#1034](https://github.com/grafana/rrweb/issues/1034)) ([5012b1e](https://github.com/grafana/rrweb/commit/5012b1eb601915a386c14045ef7cab66357413ad))
* wrong rootId value in special iframes ([#1100](https://github.com/grafana/rrweb/issues/1100)) ([0732618](https://github.com/grafana/rrweb/commit/07326182f9750646771918481f116b946a17c2a9))
* wujie shadow root ([#1763](https://github.com/grafana/rrweb/issues/1763)) ([6388fb5](https://github.com/grafana/rrweb/commit/6388fb5a468e1a860ab8bb5c6826c811dcc3100c))


### Performance Improvements

* Apply the latest text mutation only ([#885](https://github.com/grafana/rrweb/issues/885)) ([69499be](https://github.com/grafana/rrweb/commit/69499be6e201ed60d9b4e2db283ccb577822dd9f))
* Avoid an extra function call and object clone during event emission ([#1441](https://github.com/grafana/rrweb/issues/1441)) ([ae6908d](https://github.com/grafana/rrweb/commit/ae6908dcdcd7c732c1ce79eea19de5240bec1151))
* Avoid creation of intermediary array when iterating over style rules ([#1272](https://github.com/grafana/rrweb/issues/1272)) ([58c9104](https://github.com/grafana/rrweb/commit/58c9104eddc8b7994a067a97daae5684e42f892f))
* don't run the regex replace unless the selectorText contains a colon ([#1280](https://github.com/grafana/rrweb/issues/1280)) ([64420c7](https://github.com/grafana/rrweb/commit/64420c7e46abe84e63b1b4c1baa71ab30f7c9745))
* **mutation:** refactor parent removed detection to iterative procedure ([#1489](https://github.com/grafana/rrweb/issues/1489)) ([609b7fa](https://github.com/grafana/rrweb/commit/609b7fac79a552f746dc880a28927dee382cd082))
* optimize performance of the DoubleLinkedList get ([#1220](https://github.com/grafana/rrweb/issues/1220)) ([a1ec9a2](https://github.com/grafana/rrweb/commit/a1ec9a273e6634eec67098fdd880ee681648fbbd))
* record processMutation ([#1214](https://github.com/grafana/rrweb/issues/1214)) ([ebcbe8b](https://github.com/grafana/rrweb/commit/ebcbe8b0d746a0a4c07d3530387f920900f35215))
* **rrweb:** attribute mutation optimization ([#1343](https://github.com/grafana/rrweb/issues/1343)) ([05478c3](https://github.com/grafana/rrweb/commit/05478c36dde03a118099783d908bb3e465e9859c))
* **snapshot:** avoid costly generation of &lt;a&gt; element on each call to `getHref`, instead cache an anchor element and reuse it's href attributed ([5e7943d](https://github.com/grafana/rrweb/commit/5e7943dbae6e2cde76c484bdd26bc0b96f1b6dce))
* **snapshot:** avoid recreate element `a` every time ([#1387](https://github.com/grafana/rrweb/issues/1387)) ([5e7943d](https://github.com/grafana/rrweb/commit/5e7943dbae6e2cde76c484bdd26bc0b96f1b6dce))
* **web-extension:** conditional check ([#1360](https://github.com/grafana/rrweb/issues/1360)) ([0f004af](https://github.com/grafana/rrweb/commit/0f004af18dd8ba204fd80a68328fc48bf229e7f0))

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
