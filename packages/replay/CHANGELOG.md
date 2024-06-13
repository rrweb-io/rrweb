# @rrweb/replay

## 2.0.0-alpha.15

### Major Changes

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference. If you include rrweb in a script tag and referred to a `.js` file, you'll now have to update that path to include a `.umd.cjs` file. Distributed files have new paths, filenames and extensions. All packages now no longer include a `.js` files, instead they include `.cjs`, `.umd.cjs` and `.mjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments. The `.mjs` files are ES modules that can be used in modern browsers, node.js and bundlers that support ES modules. The `.cjs` files are CommonJS modules that can be used in older Node.js environments.

- [#1497](https://github.com/rrweb-io/rrweb/pull/1497) [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf) Thanks [@Juice10](https://github.com/Juice10)! - Remove the rrweb-all.js, rrweb-record.js, and rrweb-replay.js files from `rrweb` package. Now you can use `@rrweb/all`, `@rrweb/record`, and `@rrweb/replay` packages instead. Check out the README of each package for more information or check out [PR #1033](https://github.com/rrweb-io/rrweb/pull/1033) to see the changes.

### Patch Changes

- Updated dependencies [[`7261c43`](https://github.com/rrweb-io/rrweb/commit/7261c43f60973e88325edf832e4d0e057fbff0ae), [`4014305`](https://github.com/rrweb-io/rrweb/commit/40143059446cee5c042c007b1c2e976f36e172f5), [`609b7fa`](https://github.com/rrweb-io/rrweb/commit/609b7fac79a552f746dc880a28927dee382cd082), [`82f6fec`](https://github.com/rrweb-io/rrweb/commit/82f6fecf36413ecbc994a510144487f1de20d1d5), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`5c27b76`](https://github.com/rrweb-io/rrweb/commit/5c27b763192bda9dd91806f95df7c1cd0ab083a6), [`d38893f`](https://github.com/rrweb-io/rrweb/commit/d38893f6338facf331fd1f6e63c121120b81177d), [`d7cf8dd`](https://github.com/rrweb-io/rrweb/commit/d7cf8dd07547f6fb22ef82e341a88357c4053bd3), [`2606a2a`](https://github.com/rrweb-io/rrweb/commit/2606a2a28f2a6d897b8ae4ea3ec40ef0eeacbfaf), [`e08706a`](https://github.com/rrweb-io/rrweb/commit/e08706ae60268b6eb05c6292ef948c71bd423ce3)]:
  - rrweb@2.0.0-alpha.15
  - @rrweb/types@2.0.0-alpha.15
