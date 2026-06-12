# rrweb-player

## 3.0.0

### Patch Changes

- Updated dependencies [[`7f0f75f`](https://github.com/rrweb-io/rrweb/commit/7f0f75f14d96fc7043ab6cfb52dfe8bbb73b499e)]:
  - @rrweb/replay@3.0.0
  - @rrweb/packer@3.0.0

## 2.0.1

### Patch Changes

- Updated dependencies []:
  - @rrweb/replay@2.0.1
  - @rrweb/packer@2.0.1

## 2.0.0

### Major Changes

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Distributed files have new filenames, paths and extensions. **Important: If you reference distributed files or types directly, you might have to update your paths/filenames. E.g. you import from `rrweb/typings/...` or `rrdom/es`. However you run `import rrweb from 'rrweb'` you won't notice a difference with this change.** If you include rrweb files directly in a script tag, you might have to update that path to include a the `.umd.cjs` files instead. All `.js` files now use ES modules which can be used in modern browsers, node.js and bundlers that support ES modules. All npm packages now also ship `.cjs` and `.umd.cjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments (similar to the previous `.js` files). The `.cjs` files are CommonJS modules that can be used in older Node.js environments. Types should be better defined in `package.json` and if you need specific types they might be exported from new packages (for example `PlayerMachineState` and `SpeedMachineState` are now exported from `@rrweb/replay`). Check the `package.json`'s `main` and `exports` field for the available files.

- [#1031](https://github.com/rrweb-io/rrweb/pull/1031) [`ad9bc3e`](https://github.com/rrweb-io/rrweb/commit/ad9bc3ed16d9172490bd8350c6922e3726a7f585) Thanks [@Juice10](https://github.com/Juice10)! - Move shared rrweb event and recorder types into the new `@rrweb/types` package.

### Minor Changes

- [#1039](https://github.com/rrweb-io/rrweb/pull/1039) [`bdd8940`](https://github.com/rrweb-io/rrweb/commit/bdd8940098590e81bc4d36f7bcf0e0f382226039) Thanks [@DexxDing](https://github.com/DexxDing)! - Add inactive-period indicators to the player progress bar with a configurable `inactiveColor` option.

- [#1007](https://github.com/rrweb-io/rrweb/pull/1007) [`3924aaf`](https://github.com/rrweb-io/rrweb/commit/3924aafde2b07f27e30a0117f33451ad8f289bf3) Thanks [@Juice10](https://github.com/Juice10)! - Add `player.playRange(start, end, loop?, afterHook?)` to play a bounded time range, optionally looping or invoking a callback when the range ends.

- [#1006](https://github.com/rrweb-io/rrweb/pull/1006) [`6f63cf1`](https://github.com/rrweb-io/rrweb/commit/6f63cf15fcaef7e322ff28999410b0bfb77f7d31) Thanks [@Juice10](https://github.com/Juice10)! - Add a `maxScale` option to configure the player's maximum replay scale, with `0` allowing unlimited scaling.

- [#859](https://github.com/rrweb-io/rrweb/pull/859) [`e238462`](https://github.com/rrweb-io/rrweb/commit/e238462f3aff10b0242a4aef729065b7b9c8e7a1) Thanks [@Juice10](https://github.com/Juice10)! - Add support for recording canvas snapshots at a configured FPS.

- [#895](https://github.com/rrweb-io/rrweb/pull/895) [`de755ae`](https://github.com/rrweb-io/rrweb/commit/de755ae572c04131f74f251b06da6de648b112c4) Thanks [@Juice10](https://github.com/Juice10)! - Add the fast-forward virtual DOM optimization for replay.

### Patch Changes

- [#1198](https://github.com/rrweb-io/rrweb/pull/1198) [`b5e30cf`](https://github.com/rrweb-io/rrweb/commit/b5e30cf6cc7f5335d674ef1917a92bdf2895fe9e) Thanks [@charliegracie](https://github.com/charliegracie)! - Reset the finished flag in Controller `goto` instead of `handleProgressClick` so that it is properly handled if `goto` is called directly.

- [#1287](https://github.com/rrweb-io/rrweb/pull/1287) [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7) Thanks [@Juice10](https://github.com/Juice10)! - Upgrade all projects to typescript 4.9.5

- [#1126](https://github.com/rrweb-io/rrweb/pull/1126) [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Refactor all suffix of bundled scripts with commonjs module from 'js' to cjs [#1087](https://github.com/rrweb-io/rrweb/pull/1087).

- [#1247](https://github.com/rrweb-io/rrweb/pull/1247) [`a01a12e`](https://github.com/rrweb-io/rrweb/commit/a01a12ef6769f26aa922ccd6ac76499f0837f0c2) Thanks [@Juice10](https://github.com/Juice10)! - Fix `player.getMirror`, `player.playRange`, `player.$set` types in rrwebPlayer

- [#1704](https://github.com/rrweb-io/rrweb/pull/1704) [`33e01f5`](https://github.com/rrweb-io/rrweb/commit/33e01f5f005580cbab23d2d4c60dd25c0245d8f0) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Provide a /umd/ output folder alongside the /dist/ one so that we can serve UMD (Universal Module Definition) files with a .js extension, without upsetting expectations set by package.json that all .js files in /dist/ are modules

- [#1028](https://github.com/rrweb-io/rrweb/pull/1028) [`2286c11`](https://github.com/rrweb-io/rrweb/commit/2286c11939295a59702f7322fa53b60b03b2065c) Thanks [@MengZihan712](https://github.com/MengZihan712)! - Fix fullscreen player sizing so the progress bar and controls remain visible.

- [#1014](https://github.com/rrweb-io/rrweb/pull/1014) [`9de0de2`](https://github.com/rrweb-io/rrweb/commit/9de0de2cce7656621de590cbf864a65643ed5eed) Thanks [@Juice10](https://github.com/Juice10)! - Add the missing `maxScale` option to rrweb-player TypeScript definitions and document player option defaults.

- [#1045](https://github.com/rrweb-io/rrweb/pull/1045) [`e08d039`](https://github.com/rrweb-io/rrweb/commit/e08d03982b468360eafc4c9e2a3d257b73da4487) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Fix rrweb-player TypeScript imports after the `@rrweb/types` split.

- Updated dependencies [[`b2d5689`](https://github.com/rrweb-io/rrweb/commit/b2d5689864eff62c80c4439e9a4e4f0f6983b1f5), [`a8478f1`](https://github.com/rrweb-io/rrweb/commit/a8478f1dd7613a08d5f15d176d6e555497f83e0d), [`ce6019d`](https://github.com/rrweb-io/rrweb/commit/ce6019d2d6264ac8ef4cc0c5f8ff1733787f9ea0), [`bac1d7b`](https://github.com/rrweb-io/rrweb/commit/bac1d7b0cbfcf1157476c49b4b12e178aab7fc94), [`5ba933c`](https://github.com/rrweb-io/rrweb/commit/5ba933ccdb8b51dfc067319d418dbadd2f7642db), [`fd85c79`](https://github.com/rrweb-io/rrweb/commit/fd85c79e853ef89a860e795a8ae3ba318ef42ae8)]:

  - rrweb@2.0.0-alpha.2

- Updated dependencies [[`f1b23dd`](https://github.com/rrweb-io/rrweb/commit/f1b23ddc714ebaf9b66ca7a913f740e2c0524868)]:

  - rrweb@2.0.0-alpha.1

- Updated dependencies [[`22bc4c3`](https://github.com/rrweb-io/rrweb/commit/22bc4c334e88f0b8ee5488d9e1e95cd8093a15c8), [`db20184`](https://github.com/rrweb-io/rrweb/commit/db201841accd2b5df3cd7c88779aa62ab158501c), [`22bc4c3`](https://github.com/rrweb-io/rrweb/commit/22bc4c334e88f0b8ee5488d9e1e95cd8093a15c8), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`33e01f5`](https://github.com/rrweb-io/rrweb/commit/33e01f5f005580cbab23d2d4c60dd25c0245d8f0)]:
  - @rrweb/replay@2.0.0
  - @rrweb/packer@2.0.0

## 2.0.0-alpha.20

### Patch Changes

- Updated dependencies []:
  - @rrweb/replay@2.0.0-alpha.20
  - @rrweb/packer@2.0.0-alpha.20

## 2.0.0-alpha.19

### Patch Changes

- Updated dependencies []:
  - @rrweb/replay@2.0.0-alpha.19
  - @rrweb/packer@2.0.0-alpha.19

## 2.0.0-alpha.18

### Patch Changes

- Updated dependencies []:
  - @rrweb/replay@2.0.0-alpha.18
  - @rrweb/packer@2.0.0-alpha.18

## 2.0.0-alpha.17

### Patch Changes

- Updated dependencies [[`db20184`](https://github.com/rrweb-io/rrweb/commit/db201841accd2b5df3cd7c88779aa62ab158501c)]:
  - @rrweb/packer@2.0.0-alpha.17
  - @rrweb/replay@2.0.0-alpha.17

## 2.0.0-alpha.16

## 2.0.0-alpha.15

### Major Changes

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Distributed files have new filenames, paths and extensions. **Important: If you reference distributed files or types directly, you might have to update your paths/filenames. E.g. you import from `rrweb/typings/...` or `rrdom/es`. However you run `import rrweb from 'rrweb'` you won't notice a difference with this change.** If you include rrweb files directly in a script tag, you might have to update that path to include a the `.umd.cjs` files instead. All `.js` files now use ES modules which can be used in modern browsers, node.js and bundlers that support ES modules. All npm packages now also ship `.cjs` and `.umd.cjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments (similar to the previous `.js` files). The `.cjs` files are CommonJS modules that can be used in older Node.js environments. Types should be better defined in `package.json` and if you need specific types they might be exported from new packages (for example `PlayerMachineState` and `SpeedMachineState` are now exported from `@rrweb/replay`). Check the `package.json`'s `main` and `exports` field for the available files.

### Patch Changes

- Updated dependencies [[`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf)]:
  - @rrweb/packer@2.0.0-alpha.15
  - @rrweb/replay@2.0.0-alpha.15

## 2.0.0-alpha.14

### Patch Changes

- Updated dependencies [[`03b5216`](https://github.com/rrweb-io/rrweb/commit/03b5216a9403f1509b4f69d1d71ef9874277fe91), [`ae6908d`](https://github.com/rrweb-io/rrweb/commit/ae6908dcdcd7c732c1ce79eea19de5240bec1151), [`46f1b25`](https://github.com/rrweb-io/rrweb/commit/46f1b252a5919c68c68e825bd6089cc2e7d34e7c), [`cbbd1e5`](https://github.com/rrweb-io/rrweb/commit/cbbd1e55f1f7fa2eed9fa11e4152b509bdfd88f7), [`e96f668`](https://github.com/rrweb-io/rrweb/commit/e96f668c86bd0ab5dc190bb2957a170271bb2ebc)]:
  - rrweb@2.0.0-alpha.14

## 2.0.0-alpha.13

### Patch Changes

- Updated dependencies [[`3d1877c`](https://github.com/rrweb-io/rrweb/commit/3d1877cff83d9a018630674fb6e730050ceef812), [`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961), [`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961), [`02f50d2`](https://github.com/rrweb-io/rrweb/commit/02f50d260cfe72209c94de1679336737f238e216)]:
  - rrweb@2.0.0-alpha.13

## 2.0.0-alpha.12

### Patch Changes

- Updated dependencies [[`af0962c`](https://github.com/rrweb-io/rrweb/commit/af0962cc6c80b693bbc622520032d17342685cf6), [`57a940a`](https://github.com/rrweb-io/rrweb/commit/57a940afac0bdd14cd82937915d53110b5311673), [`8aea5b0`](https://github.com/rrweb-io/rrweb/commit/8aea5b00a4dfe5a6f59bd2ae72bb624f45e51e81), [`9c6edfe`](https://github.com/rrweb-io/rrweb/commit/9c6edfe2261680b4e92284be69f9d183b1eca8f4), [`1e0b273`](https://github.com/rrweb-io/rrweb/commit/1e0b27382210db0168d2a79d82c13698082b0983), [`1fe39ab`](https://github.com/rrweb-io/rrweb/commit/1fe39ab0db7f5d2b04f4a4f39fb5c0cfee33a1f8), [`05478c3`](https://github.com/rrweb-io/rrweb/commit/05478c36dde03a118099783d908bb3e465e9859c), [`58c9104`](https://github.com/rrweb-io/rrweb/commit/58c9104eddc8b7994a067a97daae5684e42f892f), [`980a38c`](https://github.com/rrweb-io/rrweb/commit/980a38c816d763833fc3491f56d03c959a41122d), [`a2be77b`](https://github.com/rrweb-io/rrweb/commit/a2be77b82826c4be0e7f3c7c9f7ee50476d5f6f8), [`a7c33f2`](https://github.com/rrweb-io/rrweb/commit/a7c33f2093c4d92faf7ae25e8bb0e088d122c13b), [`314a8dd`](https://github.com/rrweb-io/rrweb/commit/314a8dde5a13095873b89d07bac7c949918bf817), [`7c0dc9d`](https://github.com/rrweb-io/rrweb/commit/7c0dc9dfe1564c9d6624557c5b394e7844955882), [`07ac5c9`](https://github.com/rrweb-io/rrweb/commit/07ac5c9e1371824ec3ffb705f9250bbe10f4b73e)]:
  - rrweb@2.0.0-alpha.12

## 2.0.0-alpha.11

### Patch Changes

- [#1287](https://github.com/rrweb-io/rrweb/pull/1287) [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7) Thanks [@Juice10](https://github.com/Juice10)! - Upgrade all projects to typescript 4.9.5

- Updated dependencies [[`11f6567`](https://github.com/rrweb-io/rrweb/commit/11f6567fd81ef9ed0f954a7b6d5e39653f56004f), [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7)]:
  - rrweb@2.0.0-alpha.11

## 2.0.0-alpha.10

### Patch Changes

- Updated dependencies [[`7103625`](https://github.com/rrweb-io/rrweb/commit/7103625b4683cbd75732ee03973e38f573847b1c), [`d872d28`](https://github.com/rrweb-io/rrweb/commit/d872d2809e3ec8d6ff5d3d5f43bc81aff70e7548), [`36da39d`](https://github.com/rrweb-io/rrweb/commit/36da39db366a9f80c28549771ed331090a1c6647), [`bbbfa22`](https://github.com/rrweb-io/rrweb/commit/bbbfa226fc5882a01ecc1607b713f0caf797775e), [`d0fbe23`](https://github.com/rrweb-io/rrweb/commit/d0fbe23c632021410a6dd45f9028a9a012467261), [`a3de582`](https://github.com/rrweb-io/rrweb/commit/a3de582e9c32be9e0ccd84bb7df756af6b0594f7)]:
  - rrweb@2.0.0-alpha.10

## 2.0.0-alpha.9

### Patch Changes

- [#1247](https://github.com/rrweb-io/rrweb/pull/1247) [`a01a12e`](https://github.com/rrweb-io/rrweb/commit/a01a12ef6769f26aa922ccd6ac76499f0837f0c2) Thanks [@Juice10](https://github.com/Juice10)! - Fix `player.getMirror`, `player.playRange`, `player.$set` types in rrwebPlayer

- Updated dependencies [[`490b3e2`](https://github.com/rrweb-io/rrweb/commit/490b3e2b62b62d61e6f6f5391d5b879194c9a221), [`a1ec9a2`](https://github.com/rrweb-io/rrweb/commit/a1ec9a273e6634eec67098fdd880ee681648fbbd), [`490b3e2`](https://github.com/rrweb-io/rrweb/commit/490b3e2b62b62d61e6f6f5391d5b879194c9a221), [`d7c72bf`](https://github.com/rrweb-io/rrweb/commit/d7c72bff0724b46a6fa94af455220626a27104fe), [`ebcbe8b`](https://github.com/rrweb-io/rrweb/commit/ebcbe8b0d746a0a4c07d3530387f920900f35215)]:
  - rrweb@2.0.0-alpha.9

## 2.0.0-alpha.8

### Patch Changes

- [#1198](https://github.com/rrweb-io/rrweb/pull/1198) [`b5e30cf`](https://github.com/rrweb-io/rrweb/commit/b5e30cf6cc7f5335d674ef1917a92bdf2895fe9e) Thanks [@charliegracie](https://github.com/charliegracie)! - Reset the finished flag in Controller `goto` instead of `handleProgressClick` so that it is properly handled if `goto` is called directly.

- Updated dependencies [[`b5e30cf`](https://github.com/rrweb-io/rrweb/commit/b5e30cf6cc7f5335d674ef1917a92bdf2895fe9e), [`979d2b1`](https://github.com/rrweb-io/rrweb/commit/979d2b1847a3d05e2731722952e4d6bd8be54f40), [`bc84246`](https://github.com/rrweb-io/rrweb/commit/bc84246f78849a80dbb8fe9b4e76117afcc5c3f7), [`aa79db7`](https://github.com/rrweb-io/rrweb/commit/aa79db7568578ea3a413292450cd64f07481e5dd)]:
  - rrweb@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Updated dependencies [[`e0f862b`](https://github.com/rrweb-io/rrweb/commit/e0f862bac7dbaa9cfd778f5ef0f5f3fd8cbe6def), [`267e990`](https://github.com/rrweb-io/rrweb/commit/267e990dc0e45a5acaaa3ee89db7ae9171520d54), [`d2582e9`](https://github.com/rrweb-io/rrweb/commit/d2582e9a81197130cd93bc1dd778e16fddfb0be3), [`a225d8e`](https://github.com/rrweb-io/rrweb/commit/a225d8e1412a69a761c22eb45565fff0b0ce5c11), [`a82a3b4`](https://github.com/rrweb-io/rrweb/commit/a82a3b42b125aaaea607410b49f012933466c523), [`1e6f71b`](https://github.com/rrweb-io/rrweb/commit/1e6f71b3cddcfafe78b9e40edfbd75e485702e4e), [`1e6f71b`](https://github.com/rrweb-io/rrweb/commit/1e6f71b3cddcfafe78b9e40edfbd75e485702e4e), [`4cb4d0e`](https://github.com/rrweb-io/rrweb/commit/4cb4d0e95a540a366bdec157fe78d9f099514818)]:
  - rrweb@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Updated dependencies [[`e65465e`](https://github.com/rrweb-io/rrweb/commit/e65465e808178a80a4ba84970f02162ba812955e), [`f27e545`](https://github.com/rrweb-io/rrweb/commit/f27e545e1871ed2c1753d37543f556e8ddc406b4), [`f6f07e9`](https://github.com/rrweb-io/rrweb/commit/f6f07e953376634a4caf28ff8cbfed5a017c4347), [`3416c3a`](https://github.com/rrweb-io/rrweb/commit/3416c3a769e2bd2ddfbb88f5c4ff139871c567be), [`8e47ca1`](https://github.com/rrweb-io/rrweb/commit/8e47ca1021ebb4fc036b37623ef10abf7976d6dd), [`aaabdbd`](https://github.com/rrweb-io/rrweb/commit/aaabdbdff5df2abd1a294c40ed89e74bf8b2ec7c), [`5e6c132`](https://github.com/rrweb-io/rrweb/commit/5e6c132a4d0e5f5524b2201d6a73dae62b4a0877)]:
  - rrweb@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- [#1126](https://github.com/rrweb-io/rrweb/pull/1126) [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Refactor all suffix of bundled scripts with commonjs module from 'js' to cjs [#1087](https://github.com/rrweb-io/rrweb/pull/1087).

- Updated dependencies [[`1385f7a`](https://github.com/rrweb-io/rrweb/commit/1385f7acc0052f83be1458a7b00e18c026ee393f), [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff), [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff), [`3cc4323`](https://github.com/rrweb-io/rrweb/commit/3cc4323094065a12f8b65afecd45061d604e245f), [`502d15d`](https://github.com/rrweb-io/rrweb/commit/502d15df9f7f43b3408ccfbb3f14c4bb007883c4), [`8d209a6`](https://github.com/rrweb-io/rrweb/commit/8d209a62f31c4c80e3e5bc36e47d7282ee854ac7)]:
  - rrweb@2.0.0-alpha.5
