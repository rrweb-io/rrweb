# rrweb-player

## 2.0.11

## 2.0.10

### Patch Changes

- [DEV-1039] Expose destroy() function for Svelte player

## 2.0.9

## 2.0.8

## 2.0.7

## 2.0.6

### Patch Changes

- [DEV-1029] Fix for delaying play / pause goto on progress bar clicks

## 2.0.5

### Patch Changes

- [DEV-889] Player - Add loader/indication while seeking

## 2.0.4

### Patch Changes

- Expose refreshProgress instead of triggering update on every addEvent

## 2.0.3

### Patch Changes

- Trigger progress bar updates (custom events and inactive periods) on async add event

## 2.0.2

### Patch Changes

- added setDims and setDimsAndScale

## 2.0.1

## 2.0.0

### Major Changes

- Saola AI

### Patch Changes

- Updated dependencies []:
  - @saola.ai/rrweb-packer@2.0.0
  - @saola.ai/replay@2.0.0

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
