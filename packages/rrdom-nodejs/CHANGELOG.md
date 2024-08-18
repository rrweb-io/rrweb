# rrdom-nodejs

## 2.0.5

### Patch Changes

- Updated dependencies []:
  - @saola.ai/rrweb-snapshot@2.0.5
  - @saola.ai/rrdom@2.0.5

## 2.0.4

### Patch Changes

- Updated dependencies []:
  - @saola.ai/rrweb-snapshot@2.0.4
  - @saola.ai/rrdom@2.0.4

## 2.0.3

### Patch Changes

- Updated dependencies []:
  - @saola.ai/rrweb-snapshot@2.0.3
  - @saola.ai/rrdom@2.0.3

## 2.0.2

### Patch Changes

- added setDims and setDimsAndScale

- Updated dependencies []:
  - @saola.ai/rrweb-snapshot@2.0.2
  - @saola.ai/rrdom@2.0.2

## 2.0.1

### Patch Changes

- Updated dependencies []:
  - @saola.ai/rrweb-snapshot@2.0.1
  - @saola.ai/rrdom@2.0.1

## 2.0.0

### Major Changes

- Saola AI

### Patch Changes

- Updated dependencies []:
  - @saola.ai/rrdom@2.0.0
  - @saola.ai/rrweb-snapshot@2.0.0

## 2.0.0-alpha.15

### Major Changes

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Distributed files have new filenames, paths and extensions. **Important: If you reference distributed files or types directly, you might have to update your paths/filenames. E.g. you import from `rrweb/typings/...` or `rrdom/es`. However you run `import rrweb from 'rrweb'` you won't notice a difference with this change.** If you include rrweb files directly in a script tag, you might have to update that path to include a the `.umd.cjs` files instead. All `.js` files now use ES modules which can be used in modern browsers, node.js and bundlers that support ES modules. All npm packages now also ship `.cjs` and `.umd.cjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments (similar to the previous `.js` files). The `.cjs` files are CommonJS modules that can be used in older Node.js environments. Types should be better defined in `package.json` and if you need specific types they might be exported from new packages (for example `PlayerMachineState` and `SpeedMachineState` are now exported from `@rrweb/replay`). Check the `package.json`'s `main` and `exports` field for the available files.

### Patch Changes

- Updated dependencies [[`4014305`](https://github.com/rrweb-io/rrweb/commit/40143059446cee5c042c007b1c2e976f36e172f5), [`82f6fec`](https://github.com/rrweb-io/rrweb/commit/82f6fecf36413ecbc994a510144487f1de20d1d5), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`f3cf092`](https://github.com/rrweb-io/rrweb/commit/f3cf0928df30d5ed5c0d573c524be6e744c0f8d3), [`e08706a`](https://github.com/rrweb-io/rrweb/commit/e08706ae60268b6eb05c6292ef948c71bd423ce3)]:
  - rrweb-snapshot@2.0.0-alpha.15
  - rrdom@2.0.0-alpha.15

## 2.0.0-alpha.14

### Patch Changes

- Updated dependencies [[`03b5216`](https://github.com/rrweb-io/rrweb/commit/03b5216a9403f1509b4f69d1d71ef9874277fe91), [`46f1b25`](https://github.com/rrweb-io/rrweb/commit/46f1b252a5919c68c68e825bd6089cc2e7d34e7c), [`cbbd1e5`](https://github.com/rrweb-io/rrweb/commit/cbbd1e55f1f7fa2eed9fa11e4152b509bdfd88f7), [`5e7943d`](https://github.com/rrweb-io/rrweb/commit/5e7943dbae6e2cde76c484bdd26bc0b96f1b6dce), [`c0f83af`](https://github.com/rrweb-io/rrweb/commit/c0f83afab8f1565633de0e986b7e96fa56f2d25c), [`e96f668`](https://github.com/rrweb-io/rrweb/commit/e96f668c86bd0ab5dc190bb2957a170271bb2ebc)]:
  - rrweb-snapshot@2.0.0-alpha.14
  - rrdom@2.0.0-alpha.14

## 2.0.0-alpha.13

### Patch Changes

- Updated dependencies [[`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961), [`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961), [`f7c6973`](https://github.com/rrweb-io/rrweb/commit/f7c6973ae9c21b9ea014bdef7101f976f04d9356)]:
  - rrdom@2.0.0-alpha.13
  - rrweb-snapshot@2.0.0-alpha.13

## 2.0.0-alpha.12

### Patch Changes

- Updated dependencies [[`58c9104`](https://github.com/rrweb-io/rrweb/commit/58c9104eddc8b7994a067a97daae5684e42f892f), [`a2be77b`](https://github.com/rrweb-io/rrweb/commit/a2be77b82826c4be0e7f3c7c9f7ee50476d5f6f8), [`a7c33f2`](https://github.com/rrweb-io/rrweb/commit/a7c33f2093c4d92faf7ae25e8bb0e088d122c13b), [`8aea5b0`](https://github.com/rrweb-io/rrweb/commit/8aea5b00a4dfe5a6f59bd2ae72bb624f45e51e81), [`314a8dd`](https://github.com/rrweb-io/rrweb/commit/314a8dde5a13095873b89d07bac7c949918bf817), [`e607e83`](https://github.com/rrweb-io/rrweb/commit/e607e83b21d45131a56c1ff606e9519a5b475fc1), [`7c0dc9d`](https://github.com/rrweb-io/rrweb/commit/7c0dc9dfe1564c9d6624557c5b394e7844955882), [`07ac5c9`](https://github.com/rrweb-io/rrweb/commit/07ac5c9e1371824ec3ffb705f9250bbe10f4b73e)]:
  - rrweb-snapshot@2.0.0-alpha.12
  - rrdom@2.0.0-alpha.12

## 2.0.0-alpha.11

### Patch Changes

- Updated dependencies [[`11f6567`](https://github.com/rrweb-io/rrweb/commit/11f6567fd81ef9ed0f954a7b6d5e39653f56004f), [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7), [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7)]:
  - rrweb-snapshot@2.0.0-alpha.11
  - rrdom@2.0.0-alpha.11

## 2.0.0-alpha.10

### Patch Changes

- Updated dependencies [[`c6600e7`](https://github.com/rrweb-io/rrweb/commit/c6600e742b8ec0b6295816bb5de9edcd624d975e)]:
  - rrweb-snapshot@2.0.0-alpha.10
  - rrdom@2.0.0-alpha.10

## 2.0.0-alpha.9

### Patch Changes

- Updated dependencies [[`b798f2d`](https://github.com/rrweb-io/rrweb/commit/b798f2dbc07b5a24dcaf40d164159200b6c0679d), [`d7c72bf`](https://github.com/rrweb-io/rrweb/commit/d7c72bff0724b46a6fa94af455220626a27104fe)]:
  - rrdom@2.0.0-alpha.9
  - rrweb-snapshot@2.0.0-alpha.9

## 2.0.0-alpha.8

### Patch Changes

- Updated dependencies [[`bc84246`](https://github.com/rrweb-io/rrweb/commit/bc84246f78849a80dbb8fe9b4e76117afcc5c3f7), [`d0fdc0f`](https://github.com/rrweb-io/rrweb/commit/d0fdc0f273bb156a1faab4782b40fbec8dccf915)]:
  - rrweb-snapshot@2.0.0-alpha.8
  - rrdom@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Updated dependencies [[`d2582e9`](https://github.com/rrweb-io/rrweb/commit/d2582e9a81197130cd93bc1dd778e16fddfb0be3), [`e7f0c80`](https://github.com/rrweb-io/rrweb/commit/e7f0c808c3f348fb27d1acd5fa300a5d92b14d00)]:
  - rrweb-snapshot@2.0.0-alpha.7
  - rrdom@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Updated dependencies [[`c28ef5f`](https://github.com/rrweb-io/rrweb/commit/c28ef5f658abb93086504581409cf7a376db48dc), [`f6f07e9`](https://github.com/rrweb-io/rrweb/commit/f6f07e953376634a4caf28ff8cbfed5a017c4347), [`eac9b18`](https://github.com/rrweb-io/rrweb/commit/eac9b18bbfa3c350797b99b583dd93a5fc32b828), [`f27e545`](https://github.com/rrweb-io/rrweb/commit/f27e545e1871ed2c1753d37543f556e8ddc406b4), [`8e47ca1`](https://github.com/rrweb-io/rrweb/commit/8e47ca1021ebb4fc036b37623ef10abf7976d6dd)]:
  - rrweb-snapshot@2.0.0-alpha.6
  - rrdom@2.0.0-alpha.6

## 2.0.0-alpha.5

### Major Changes

- [#1127](https://github.com/rrweb-io/rrweb/pull/1127) [`3cc4323`](https://github.com/rrweb-io/rrweb/commit/3cc4323094065a12f8b65afecd45061d604e245f) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Refactor: Improve performance by 80% in a super large benchmark case.

  1. Refactor: change the data structure of childNodes from array to linked list
  2. Improve the performance of the "contains" function. New algorithm will reduce the complexity from O(n) to O(logn)

### Patch Changes

- [#1126](https://github.com/rrweb-io/rrweb/pull/1126) [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff) Thanks [@YunFeng0817](https://github.com/YunFeng0817)! - Refactor all suffix of bundled scripts with commonjs module from 'js' to cjs [#1087](https://github.com/rrweb-io/rrweb/pull/1087).

- Updated dependencies [[`1385f7a`](https://github.com/rrweb-io/rrweb/commit/1385f7acc0052f83be1458a7b00e18c026ee393f), [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff), [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff), [`3cc4323`](https://github.com/rrweb-io/rrweb/commit/3cc4323094065a12f8b65afecd45061d604e245f)]:
  - rrweb-snapshot@2.0.0-alpha.5
  - rrdom@2.0.0-alpha.5
