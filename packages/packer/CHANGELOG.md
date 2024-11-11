# @rrweb/packer

## 2.0.15

### Patch Changes

- [REVERT] Commit eb1fb6d60f4381ee87272bdceccdf6ad5297284f - new version 2.0.15

- Updated dependencies []:
  - @saola.ai/rrweb-types@2.0.15

## 2.0.14

### Patch Changes

- [REVERT] Commit eb1fb6d60f4381ee87272bdceccdf6ad5297284f

- Updated dependencies []:
  - @saola.ai/rrweb-types@2.0.14

## 2.0.13

### Patch Changes

- Merge from rrweb remote upstream

- Updated dependencies []:
  - @saola.ai/rrweb-types@2.0.13

## 2.0.0-alpha.17

### Patch Changes

- [`db20184`](https://github.com/rrweb-io/rrweb/commit/db201841accd2b5df3cd7c88779aa62ab158501c) Thanks [@Juice10](https://github.com/Juice10)! - Keep package version in sync with other packages

- Updated dependencies [[`335639a`](https://github.com/rrweb-io/rrweb/commit/335639af9b0ce7f70eb0f38ce113d877c7325158)]:
  - @rrweb/types@2.0.0-alpha.17

## 2.0.0

### Major Changes

- Saola AI

### Patch Changes

- Updated dependencies []:
  - @saola.ai/rrweb-types@2.0.0

## 2.0.0-alpha.15

### Major Changes

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Split plugins out of rrweb and move them into their own packages: @rrweb/packer, @rrweb/rrweb-plugin-canvas-webrtc-record, @rrweb/rrweb-plugin-canvas-webrtc-replay, @rrweb/rrweb-plugin-sequential-id-record, @rrweb/rrweb-plugin-sequential-id-replay, @rrweb/rrweb-plugin-console-record, @rrweb/rrweb-plugin-console-replay. Check out the README of each package for more information or check out https://github.com/rrweb-io/rrweb/pull/1033 to see the changes.

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Distributed files have new filenames, paths and extensions. **Important: If you reference distributed files or types directly, you might have to update your paths/filenames. E.g. you import from `rrweb/typings/...` or `rrdom/es`. However you run `import rrweb from 'rrweb'` you won't notice a difference with this change.** If you include rrweb files directly in a script tag, you might have to update that path to include a the `.umd.cjs` files instead. All `.js` files now use ES modules which can be used in modern browsers, node.js and bundlers that support ES modules. All npm packages now also ship `.cjs` and `.umd.cjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments (similar to the previous `.js` files). The `.cjs` files are CommonJS modules that can be used in older Node.js environments. Types should be better defined in `package.json` and if you need specific types they might be exported from new packages (for example `PlayerMachineState` and `SpeedMachineState` are now exported from `@rrweb/replay`). Check the `package.json`'s `main` and `exports` field for the available files.

### Patch Changes

- Updated dependencies [[`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf)]:
  - @rrweb/types@2.0.0-alpha.15
