# @rrweb/packer

## 3.0.0

### Patch Changes

- Updated dependencies [[`6fe4fed`](https://github.com/rrweb-io/rrweb/commit/6fe4fed0fdce46b0562a0770a056f77e326bed79)]:
  - @rrweb/types@3.0.0

## 2.0.1

### Patch Changes

- Updated dependencies []:
  - @rrweb/types@2.0.1

## 2.0.0

### Major Changes

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Split plugins out of rrweb and move them into their own packages: @rrweb/packer, @rrweb/rrweb-plugin-canvas-webrtc-record, @rrweb/rrweb-plugin-canvas-webrtc-replay, @rrweb/rrweb-plugin-sequential-id-record, @rrweb/rrweb-plugin-sequential-id-replay, @rrweb/rrweb-plugin-console-record, @rrweb/rrweb-plugin-console-replay. Check out the README of each package for more information or check out https://github.com/rrweb-io/rrweb/pull/1033 to see the changes.

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Distributed files have new filenames, paths and extensions. **Important: If you reference distributed files or types directly, you might have to update your paths/filenames. E.g. you import from `rrweb/typings/...` or `rrdom/es`. However you run `import rrweb from 'rrweb'` you won't notice a difference with this change.** If you include rrweb files directly in a script tag, you might have to update that path to include a the `.umd.cjs` files instead. All `.js` files now use ES modules which can be used in modern browsers, node.js and bundlers that support ES modules. All npm packages now also ship `.cjs` and `.umd.cjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments (similar to the previous `.js` files). The `.cjs` files are CommonJS modules that can be used in older Node.js environments. Types should be better defined in `package.json` and if you need specific types they might be exported from new packages (for example `PlayerMachineState` and `SpeedMachineState` are now exported from `@rrweb/replay`). Check the `package.json`'s `main` and `exports` field for the available files.

### Patch Changes

- [`db20184`](https://github.com/rrweb-io/rrweb/commit/db201841accd2b5df3cd7c88779aa62ab158501c) Thanks [@Juice10](https://github.com/Juice10)! - Keep package version in sync with other packages

- [#1762](https://github.com/rrweb-io/rrweb/pull/1762) [`22bc4c3`](https://github.com/rrweb-io/rrweb/commit/22bc4c334e88f0b8ee5488d9e1e95cd8093a15c8) Thanks [@Juice10](https://github.com/Juice10)! - Drop base64 inlined worker source from all bundles

- [#1704](https://github.com/rrweb-io/rrweb/pull/1704) [`33e01f5`](https://github.com/rrweb-io/rrweb/commit/33e01f5f005580cbab23d2d4c60dd25c0245d8f0) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Provide a /umd/ output folder alongside the /dist/ one so that we can serve UMD (Universal Module Definition) files with a .js extension, without upsetting expectations set by package.json that all .js files in /dist/ are modules

- Updated dependencies [[`0f0a532`](https://github.com/rrweb-io/rrweb/commit/0f0a532a2ca6b9a71acefcf3af4415beb47db0bb), [`d872d28`](https://github.com/rrweb-io/rrweb/commit/d872d2809e3ec8d6ff5d3d5f43bc81aff70e7548), [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7), [`979d2b1`](https://github.com/rrweb-io/rrweb/commit/979d2b1847a3d05e2731722952e4d6bd8be54f40), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`335639a`](https://github.com/rrweb-io/rrweb/commit/335639af9b0ce7f70eb0f38ce113d877c7325158), [`123a81e`](https://github.com/rrweb-io/rrweb/commit/123a81e12d072cd95d701231176d7eb2d03b3961), [`33e01f5`](https://github.com/rrweb-io/rrweb/commit/33e01f5f005580cbab23d2d4c60dd25c0245d8f0), [`c278d06`](https://github.com/rrweb-io/rrweb/commit/c278d068a0e2f1175cce7cc63920ac1fbf4783cf)]:
  - @rrweb/types@2.0.0

## 2.0.0-alpha.20

### Patch Changes

- Updated dependencies []:
  - @rrweb/types@2.0.0-alpha.20

## 2.0.0-alpha.19

### Patch Changes

- Updated dependencies []:
  - @rrweb/types@2.0.0-alpha.19

## 2.0.0-alpha.18

### Patch Changes

- Updated dependencies []:
  - @rrweb/types@2.0.0-alpha.18

## 2.0.0-alpha.17

### Patch Changes

- [`db20184`](https://github.com/rrweb-io/rrweb/commit/db201841accd2b5df3cd7c88779aa62ab158501c) Thanks [@Juice10](https://github.com/Juice10)! - Keep package version in sync with other packages

- Updated dependencies [[`335639a`](https://github.com/rrweb-io/rrweb/commit/335639af9b0ce7f70eb0f38ce113d877c7325158)]:
  - @rrweb/types@2.0.0-alpha.17

## 2.0.0-alpha.15

### Major Changes

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Split plugins out of rrweb and move them into their own packages: @rrweb/packer, @rrweb/rrweb-plugin-canvas-webrtc-record, @rrweb/rrweb-plugin-canvas-webrtc-replay, @rrweb/rrweb-plugin-sequential-id-record, @rrweb/rrweb-plugin-sequential-id-replay, @rrweb/rrweb-plugin-console-record, @rrweb/rrweb-plugin-console-replay. Check out the README of each package for more information or check out https://github.com/rrweb-io/rrweb/pull/1033 to see the changes.

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Distributed files have new filenames, paths and extensions. **Important: If you reference distributed files or types directly, you might have to update your paths/filenames. E.g. you import from `rrweb/typings/...` or `rrdom/es`. However you run `import rrweb from 'rrweb'` you won't notice a difference with this change.** If you include rrweb files directly in a script tag, you might have to update that path to include a the `.umd.cjs` files instead. All `.js` files now use ES modules which can be used in modern browsers, node.js and bundlers that support ES modules. All npm packages now also ship `.cjs` and `.umd.cjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments (similar to the previous `.js` files). The `.cjs` files are CommonJS modules that can be used in older Node.js environments. Types should be better defined in `package.json` and if you need specific types they might be exported from new packages (for example `PlayerMachineState` and `SpeedMachineState` are now exported from `@rrweb/replay`). Check the `package.json`'s `main` and `exports` field for the available files.

### Patch Changes

- Updated dependencies [[`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf)]:
  - @rrweb/types@2.0.0-alpha.15
