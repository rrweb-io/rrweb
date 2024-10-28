# @amplitude/rrweb-plugin-canvas-webrtc-record

## 2.0.0-alpha.26

### Patch Changes

- Updated dependencies [[`e8e18b5`](https://github.com/amplitude/rrweb/commit/e8e18b55c1de705ae7b7bdf66b46f6e45e06b65e)]:
  - @amplitude/rrweb@2.0.0-alpha.26

## 2.0.0-alpha.25

### Major Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Split plugins out of rrweb and move them into their own packages: @rrweb/packer, @rrweb/rrweb-plugin-canvas-webrtc-record, @rrweb/rrweb-plugin-canvas-webrtc-replay, @rrweb/rrweb-plugin-sequential-id-record, @rrweb/rrweb-plugin-sequential-id-replay, @rrweb/rrweb-plugin-console-record, @rrweb/rrweb-plugin-console-replay. Check out the README of each package for more information or check out https://github.com/rrweb-io/rrweb/pull/1033 to see the changes.

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference. If you include rrweb in a script tag and referred to a `.js` file, you'll now have to update that path to include a `.umd.cjs` file. Distributed files have new paths, filenames and extensions. All packages now no longer include a `.js` files, instead they include `.cjs`, `.umd.cjs` and `.mjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments. The `.mjs` files are ES modules that can be used in modern browsers, node.js and bundlers that support ES modules. The `.cjs` files are CommonJS modules that can be used in older Node.js environments.

### Patch Changes

- Updated dependencies [[`becf687`](https://github.com/amplitude/rrweb/commit/becf687910a21be618c8644642673217d75a4bfe), [`178f1e6`](https://github.com/amplitude/rrweb/commit/178f1e6e450e0903e9dadc4dc96dd74236f296ba), [`4fe0153`](https://github.com/amplitude/rrweb/commit/4fe01532dc533ecbcc01d3fa5fcec8a0abbf292e), [`1dba10a`](https://github.com/amplitude/rrweb/commit/1dba10a215ea873fd1663d77c58c783c9d8a0edc), [`e8a0ecd`](https://github.com/amplitude/rrweb/commit/e8a0ecd0268e599c17e97bcd91f94c44b04d79a0), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`f317df7`](https://github.com/amplitude/rrweb/commit/f317df792ba69ee33b7148f486dea8e77cfab42a), [`3ae57a6`](https://github.com/amplitude/rrweb/commit/3ae57a6d8803f4e076a448fa7e3967fa3c125487), [`3ef1e70`](https://github.com/amplitude/rrweb/commit/3ef1e709eb43b21505ed6bde405c2f6f83b0badc), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`4442d21`](https://github.com/amplitude/rrweb/commit/4442d21c5b1b6fb6dd6af6f52f97ca0317005ad8), [`9e9226f`](https://github.com/amplitude/rrweb/commit/9e9226fc00031dc6c2012dedcd53ec41db86b975)]:
  - @amplitude/rrweb@2.0.0-alpha.25
