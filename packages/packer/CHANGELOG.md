# @amplitude/rrweb-packer

## 2.0.0-alpha.40

### Patch Changes

- Updated dependencies [[`f66e0ab`](https://github.com/amplitude/rrweb/commit/f66e0ab409a391112e9204f32bd1977db72207da)]:
  - @amplitude/rrweb-types@2.0.0-alpha.40

## 2.0.0-alpha.39

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.39

## 2.0.0-alpha.38

### Patch Changes

- [#92](https://github.com/amplitude/rrweb/pull/92) [`cf64007`](https://github.com/amplitude/rrweb/commit/cf64007425486148519f667943f5ff1e77274e60) Thanks [@lewgordon-amplitude](https://github.com/lewgordon-amplitude)! - chore: bump package versions to re-sync after rrweb-capture publish

- Updated dependencies [[`cf64007`](https://github.com/amplitude/rrweb/commit/cf64007425486148519f667943f5ff1e77274e60)]:
  - @amplitude/rrweb-types@2.0.0-alpha.38

## 2.0.0-alpha.37

### Patch Changes

- Updated dependencies [[`9f39d67`](https://github.com/amplitude/rrweb/commit/9f39d6769164eacb4045fd16732d8db83c41aa21)]:
  - @amplitude/rrweb-types@2.0.0-alpha.37

## 2.0.0-alpha.36

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.36

## 2.0.0-alpha.35

### Patch Changes

- [#73](https://github.com/amplitude/rrweb/pull/73) [`b2a7533`](https://github.com/amplitude/rrweb/commit/b2a75335eabe17a6e08aae68307fcd29e356e717) Thanks [@lewgordon-amplitude](https://github.com/lewgordon-amplitude)! - Upgrade vite from ^6.0.1 to ^6 across all packages. Vite 6.0.1 had a bug causing parser errors with CSS imports in TypeScript files, which is fixed in Vite 6.3.0+. Also fixed Svelte component issues (self-closing tags, ARIA attributes) and moved CSS import to main.ts to preserve runtime-generated classes.

- Updated dependencies [[`b2a7533`](https://github.com/amplitude/rrweb/commit/b2a75335eabe17a6e08aae68307fcd29e356e717)]:
  - @amplitude/rrweb-types@2.0.0-alpha.35

## 2.0.0-alpha.34

### Patch Changes

- [#67](https://github.com/amplitude/rrweb/pull/67) [`d6028a2`](https://github.com/amplitude/rrweb/commit/d6028a263aa64ba00122ca60f8b67431f4bd031f) Thanks [@lewgordon-amplitude](https://github.com/lewgordon-amplitude)! - Drop base64 inlined worker source from all bundles

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.34

## 2.0.0-alpha.33

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.33

## 2.0.0-alpha.32

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.32

## 2.0.0-alpha.31

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.31

## 2.0.0-alpha.30

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.30

## 2.0.0-alpha.29

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.29

## 2.0.0-alpha.28

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.28

## 2.0.0-alpha.27

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.27

## 2.0.0-alpha.26

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-types@2.0.0-alpha.26

## 2.0.0-alpha.25

### Major Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Split plugins out of rrweb and move them into their own packages: @rrweb/packer, @rrweb/rrweb-plugin-canvas-webrtc-record, @rrweb/rrweb-plugin-canvas-webrtc-replay, @rrweb/rrweb-plugin-sequential-id-record, @rrweb/rrweb-plugin-sequential-id-replay, @rrweb/rrweb-plugin-console-record, @rrweb/rrweb-plugin-console-replay. Check out the README of each package for more information or check out https://github.com/rrweb-io/rrweb/pull/1033 to see the changes.

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference. If you include rrweb in a script tag and referred to a `.js` file, you'll now have to update that path to include a `.umd.cjs` file. Distributed files have new paths, filenames and extensions. All packages now no longer include a `.js` files, instead they include `.cjs`, `.umd.cjs` and `.mjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments. The `.mjs` files are ES modules that can be used in modern browsers, node.js and bundlers that support ES modules. The `.cjs` files are CommonJS modules that can be used in older Node.js environments.

### Patch Changes

- Updated dependencies [[`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`3ae57a6`](https://github.com/amplitude/rrweb/commit/3ae57a6d8803f4e076a448fa7e3967fa3c125487)]:
  - @amplitude/rrweb-types@2.0.0-alpha.25
