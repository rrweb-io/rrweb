# @amplitude/rrweb-plugin-canvas-webrtc-replay

## 2.1.0

### Major Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Split plugins out of rrweb and move them into their own packages: @rrweb/packer, @rrweb/rrweb-plugin-canvas-webrtc-record, @rrweb/rrweb-plugin-canvas-webrtc-replay, @rrweb/rrweb-plugin-sequential-id-record, @rrweb/rrweb-plugin-sequential-id-replay, @rrweb/rrweb-plugin-console-record, @rrweb/rrweb-plugin-console-replay. Check out the README of each package for more information or check out https://github.com/rrweb-io/rrweb/pull/1033 to see the changes.

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference. If you include rrweb in a script tag and referred to a `.js` file, you'll now have to update that path to include a `.umd.cjs` file. Distributed files have new paths, filenames and extensions. All packages now no longer include a `.js` files, instead they include `.cjs`, `.umd.cjs` and `.mjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments. The `.mjs` files are ES modules that can be used in modern browsers, node.js and bundlers that support ES modules. The `.cjs` files are CommonJS modules that can be used in older Node.js environments.

### Patch Changes

- [#73](https://github.com/amplitude/rrweb/pull/73) [`b2a7533`](https://github.com/amplitude/rrweb/commit/b2a75335eabe17a6e08aae68307fcd29e356e717) Thanks [@lewgordon-amplitude](https://github.com/lewgordon-amplitude)! - Upgrade vite from ^6.0.1 to ^6 across all packages. Vite 6.0.1 had a bug causing parser errors with CSS imports in TypeScript files, which is fixed in Vite 6.3.0+. Also fixed Svelte component issues (self-closing tags, ARIA attributes) and moved CSS import to main.ts to preserve runtime-generated classes.

- [#43](https://github.com/amplitude/rrweb/pull/43) [`4fe0153`](https://github.com/amplitude/rrweb/commit/4fe01532dc533ecbcc01d3fa5fcec8a0abbf292e) Thanks [@jxiwang](https://github.com/jxiwang)! - Export `ReplayPlugin` from rrweb directly. Previously we had to do `import type { ReplayPlugin } from 'rrweb/dist/types';` now we can do `import type { ReplayPlugin } from 'rrweb';`

- [#92](https://github.com/amplitude/rrweb/pull/92) [`cf64007`](https://github.com/amplitude/rrweb/commit/cf64007425486148519f667943f5ff1e77274e60) Thanks [@lewgordon-amplitude](https://github.com/lewgordon-amplitude)! - chore: bump package versions to re-sync after rrweb-capture publish

- Updated dependencies [[`becf687`](https://github.com/amplitude/rrweb/commit/becf687910a21be618c8644642673217d75a4bfe), [`931a6bb`](https://github.com/amplitude/rrweb/commit/931a6bbc34cb9b4f0daa3e99544b4990001460a1), [`e9cfd9f`](https://github.com/amplitude/rrweb/commit/e9cfd9fbc1876c641e9ededa8e1088e86fa6aab7), [`b2a7533`](https://github.com/amplitude/rrweb/commit/b2a75335eabe17a6e08aae68307fcd29e356e717), [`178f1e6`](https://github.com/amplitude/rrweb/commit/178f1e6e450e0903e9dadc4dc96dd74236f296ba), [`d6028a2`](https://github.com/amplitude/rrweb/commit/d6028a263aa64ba00122ca60f8b67431f4bd031f), [`7824d62`](https://github.com/amplitude/rrweb/commit/7824d62c7cf227c678ee1a1f500902fbfdd6c36a), [`7824d62`](https://github.com/amplitude/rrweb/commit/7824d62c7cf227c678ee1a1f500902fbfdd6c36a), [`4fe0153`](https://github.com/amplitude/rrweb/commit/4fe01532dc533ecbcc01d3fa5fcec8a0abbf292e), [`9f0fb7c`](https://github.com/amplitude/rrweb/commit/9f0fb7c53f6910a33a69a843a8773e939f42b0fa), [`b996cbb`](https://github.com/amplitude/rrweb/commit/b996cbb9339ee928d2364b16dc932921d2dd6492), [`aaee874`](https://github.com/amplitude/rrweb/commit/aaee87499109fef069ec4924afc127bda2886bfc), [`a722f4d`](https://github.com/amplitude/rrweb/commit/a722f4df44580162ac3840864d286623f8d95488), [`0983ef8`](https://github.com/amplitude/rrweb/commit/0983ef8c952ff0038e555e4147e008d2fb174248), [`a1d5962`](https://github.com/amplitude/rrweb/commit/a1d596254aa12bd85295f7c759ed28637cdffa04), [`e8d02c7`](https://github.com/amplitude/rrweb/commit/e8d02c78153ed954dc7aa44c6c720c550e4e1252), [`1dba10a`](https://github.com/amplitude/rrweb/commit/1dba10a215ea873fd1663d77c58c783c9d8a0edc), [`a5ef2a8`](https://github.com/amplitude/rrweb/commit/a5ef2a867154aed9cc49cdeb7ef1056095e264d1), [`43f38b1`](https://github.com/amplitude/rrweb/commit/43f38b1e9c9bf0f64fbf288ac868000ca876de81), [`e8a0ecd`](https://github.com/amplitude/rrweb/commit/e8a0ecd0268e599c17e97bcd91f94c44b04d79a0), [`eb5ca1c`](https://github.com/amplitude/rrweb/commit/eb5ca1c7e77825b43a19cc485d78149054c51453), [`f66e0ab`](https://github.com/amplitude/rrweb/commit/f66e0ab409a391112e9204f32bd1977db72207da), [`d4dacd5`](https://github.com/amplitude/rrweb/commit/d4dacd507dfa8f7719ae6e136042843ba47b7302), [`bc92f7c`](https://github.com/amplitude/rrweb/commit/bc92f7ca0c5887aa7ca8943b3966a23e92e02c11), [`8002e3b`](https://github.com/amplitude/rrweb/commit/8002e3b251e6e38a9c307b176f9b8ecb3c16bc57), [`e8e18b5`](https://github.com/amplitude/rrweb/commit/e8e18b55c1de705ae7b7bdf66b46f6e45e06b65e), [`0c34ddd`](https://github.com/amplitude/rrweb/commit/0c34dddfb350d897e0a684e7860e699d20c544c4), [`53b18a9`](https://github.com/amplitude/rrweb/commit/53b18a954d09c487fc08e46d8aa4030500f43b86), [`87cba12`](https://github.com/amplitude/rrweb/commit/87cba12ebbc2da78671c16be6932c10b4c1cbb6d), [`d19821b`](https://github.com/amplitude/rrweb/commit/d19821b6e4d5cb3516b5e2a76ff8fa65dc12d182), [`8cb959c`](https://github.com/amplitude/rrweb/commit/8cb959c1bf745c0a0e94bd49f0bbda40cccbbe07), [`6d5cbf0`](https://github.com/amplitude/rrweb/commit/6d5cbf098d3322a9d2e29df0664d199025332e2a), [`5b85646`](https://github.com/amplitude/rrweb/commit/5b85646a9557c89d594c6a484f576fbdb0c38eb7), [`2dd990c`](https://github.com/amplitude/rrweb/commit/2dd990cbcfbaf5e552816379115608a9762e1b45), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`2dd990c`](https://github.com/amplitude/rrweb/commit/2dd990cbcfbaf5e552816379115608a9762e1b45), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`f317df7`](https://github.com/amplitude/rrweb/commit/f317df792ba69ee33b7148f486dea8e77cfab42a), [`f876ea5`](https://github.com/amplitude/rrweb/commit/f876ea55e21653d682a983b320f611d9ab09e0ad), [`cf64007`](https://github.com/amplitude/rrweb/commit/cf64007425486148519f667943f5ff1e77274e60), [`942c7ce`](https://github.com/amplitude/rrweb/commit/942c7ce20446ffcd8cac52814fc7ea0501e82b20), [`c7dfd53`](https://github.com/amplitude/rrweb/commit/c7dfd538c59dce2e4c3db4085beb2e2cec9168bf), [`f075371`](https://github.com/amplitude/rrweb/commit/f075371b7c8125a69422322c3d63e237d3100e9c), [`bece5b0`](https://github.com/amplitude/rrweb/commit/bece5b0e941970779d9b76fbcf376c96f15875bb), [`8017f2a`](https://github.com/amplitude/rrweb/commit/8017f2a2901ab5c73b47952ad1fb012d37eb3efc), [`5b85646`](https://github.com/amplitude/rrweb/commit/5b85646a9557c89d594c6a484f576fbdb0c38eb7), [`3ae57a6`](https://github.com/amplitude/rrweb/commit/3ae57a6d8803f4e076a448fa7e3967fa3c125487), [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560), [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560), [`3ef1e70`](https://github.com/amplitude/rrweb/commit/3ef1e709eb43b21505ed6bde405c2f6f83b0badc), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`87cba12`](https://github.com/amplitude/rrweb/commit/87cba12ebbc2da78671c16be6932c10b4c1cbb6d), [`ffdf49c`](https://github.com/amplitude/rrweb/commit/ffdf49c6e9f44177f80b320efdbfdb85a4da0756), [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560), [`5e4aed5`](https://github.com/amplitude/rrweb/commit/5e4aed53332a46253087f58b2f0e39924c023c1d), [`9f39d67`](https://github.com/amplitude/rrweb/commit/9f39d6769164eacb4045fd16732d8db83c41aa21), [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560), [`6b175a4`](https://github.com/amplitude/rrweb/commit/6b175a4a945ea79b4cea6c609544ad1502a65610), [`ba7f3d5`](https://github.com/amplitude/rrweb/commit/ba7f3d50e982d6d2e5c1dd4868a536db5d3572e9), [`c400629`](https://github.com/amplitude/rrweb/commit/c4006294af905b3c10d793d941ca00426300c092), [`4442d21`](https://github.com/amplitude/rrweb/commit/4442d21c5b1b6fb6dd6af6f52f97ca0317005ad8), [`9e9226f`](https://github.com/amplitude/rrweb/commit/9e9226fc00031dc6c2012dedcd53ec41db86b975)]:
  - @amplitude/rrweb@2.0.0

## 2.0.0-alpha.40

### Patch Changes

- Updated dependencies [[`f66e0ab`](https://github.com/amplitude/rrweb/commit/f66e0ab409a391112e9204f32bd1977db72207da)]:
  - @amplitude/rrweb@2.0.0-alpha.40

## 2.0.0-alpha.39

### Patch Changes

- Updated dependencies [[`5e4aed5`](https://github.com/amplitude/rrweb/commit/5e4aed53332a46253087f58b2f0e39924c023c1d)]:
  - @amplitude/rrweb@2.0.0-alpha.39

## 2.0.0-alpha.38

### Patch Changes

- [#92](https://github.com/amplitude/rrweb/pull/92) [`cf64007`](https://github.com/amplitude/rrweb/commit/cf64007425486148519f667943f5ff1e77274e60) Thanks [@lewgordon-amplitude](https://github.com/lewgordon-amplitude)! - chore: bump package versions to re-sync after rrweb-capture publish

- Updated dependencies [[`cf64007`](https://github.com/amplitude/rrweb/commit/cf64007425486148519f667943f5ff1e77274e60)]:
  - @amplitude/rrweb@2.0.0-alpha.38

## 2.0.0-alpha.37

### Patch Changes

- Updated dependencies [[`9f39d67`](https://github.com/amplitude/rrweb/commit/9f39d6769164eacb4045fd16732d8db83c41aa21)]:
  - @amplitude/rrweb@2.0.0-alpha.37

## 2.0.0-alpha.36

### Patch Changes

- Updated dependencies [[`eb5ca1c`](https://github.com/amplitude/rrweb/commit/eb5ca1c7e77825b43a19cc485d78149054c51453)]:
  - @amplitude/rrweb@2.0.0-alpha.36

## 2.0.0-alpha.35

### Patch Changes

- [#73](https://github.com/amplitude/rrweb/pull/73) [`b2a7533`](https://github.com/amplitude/rrweb/commit/b2a75335eabe17a6e08aae68307fcd29e356e717) Thanks [@lewgordon-amplitude](https://github.com/lewgordon-amplitude)! - Upgrade vite from ^6.0.1 to ^6 across all packages. Vite 6.0.1 had a bug causing parser errors with CSS imports in TypeScript files, which is fixed in Vite 6.3.0+. Also fixed Svelte component issues (self-closing tags, ARIA attributes) and moved CSS import to main.ts to preserve runtime-generated classes.

- Updated dependencies [[`b2a7533`](https://github.com/amplitude/rrweb/commit/b2a75335eabe17a6e08aae68307fcd29e356e717)]:
  - @amplitude/rrweb@2.0.0-alpha.35

## 2.0.0-alpha.34

### Patch Changes

- Updated dependencies [[`d6028a2`](https://github.com/amplitude/rrweb/commit/d6028a263aa64ba00122ca60f8b67431f4bd031f)]:
  - @amplitude/rrweb@2.0.0-alpha.34

## 2.0.0-alpha.33

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb@2.0.0-alpha.33

## 2.0.0-alpha.32

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb@2.0.0-alpha.32

## 2.0.0-alpha.31

### Patch Changes

- Updated dependencies [[`bece5b0`](https://github.com/amplitude/rrweb/commit/bece5b0e941970779d9b76fbcf376c96f15875bb)]:
  - @amplitude/rrweb@2.0.0-alpha.31

## 2.0.0-alpha.30

### Patch Changes

- Updated dependencies [[`a722f4d`](https://github.com/amplitude/rrweb/commit/a722f4df44580162ac3840864d286623f8d95488)]:
  - @amplitude/rrweb@2.0.0-alpha.30

## 2.0.0-alpha.29

### Patch Changes

- Updated dependencies [[`7824d62`](https://github.com/amplitude/rrweb/commit/7824d62c7cf227c678ee1a1f500902fbfdd6c36a), [`7824d62`](https://github.com/amplitude/rrweb/commit/7824d62c7cf227c678ee1a1f500902fbfdd6c36a)]:
  - @amplitude/rrweb@2.0.0-alpha.29

## 2.0.0-alpha.28

### Patch Changes

- Updated dependencies [[`6b175a4`](https://github.com/amplitude/rrweb/commit/6b175a4a945ea79b4cea6c609544ad1502a65610)]:
  - @amplitude/rrweb@2.0.0-alpha.28

## 2.0.0-alpha.27

### Patch Changes

- Updated dependencies [[`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560), [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560), [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560), [`197466e`](https://github.com/amplitude/rrweb/commit/197466e020a06a29c67bd8e3b96f6f7341c82560)]:
  - @amplitude/rrweb@2.0.0-alpha.27

## 2.0.0-alpha.26

### Patch Changes

- Updated dependencies [[`e8e18b5`](https://github.com/amplitude/rrweb/commit/e8e18b55c1de705ae7b7bdf66b46f6e45e06b65e)]:
  - @amplitude/rrweb@2.0.0-alpha.26

## 2.0.0-alpha.25

### Major Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Split plugins out of rrweb and move them into their own packages: @rrweb/packer, @rrweb/rrweb-plugin-canvas-webrtc-record, @rrweb/rrweb-plugin-canvas-webrtc-replay, @rrweb/rrweb-plugin-sequential-id-record, @rrweb/rrweb-plugin-sequential-id-replay, @rrweb/rrweb-plugin-console-record, @rrweb/rrweb-plugin-console-replay. Check out the README of each package for more information or check out https://github.com/rrweb-io/rrweb/pull/1033 to see the changes.

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference. If you include rrweb in a script tag and referred to a `.js` file, you'll now have to update that path to include a `.umd.cjs` file. Distributed files have new paths, filenames and extensions. All packages now no longer include a `.js` files, instead they include `.cjs`, `.umd.cjs` and `.mjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments. The `.mjs` files are ES modules that can be used in modern browsers, node.js and bundlers that support ES modules. The `.cjs` files are CommonJS modules that can be used in older Node.js environments.

### Patch Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`4fe0153`](https://github.com/amplitude/rrweb/commit/4fe01532dc533ecbcc01d3fa5fcec8a0abbf292e) Thanks [@jxiwang](https://github.com/jxiwang)! - Export `ReplayPlugin` from rrweb directly. Previously we had to do `import type { ReplayPlugin } from 'rrweb/dist/types';` now we can do `import type { ReplayPlugin } from 'rrweb';`

- Updated dependencies [[`becf687`](https://github.com/amplitude/rrweb/commit/becf687910a21be618c8644642673217d75a4bfe), [`178f1e6`](https://github.com/amplitude/rrweb/commit/178f1e6e450e0903e9dadc4dc96dd74236f296ba), [`4fe0153`](https://github.com/amplitude/rrweb/commit/4fe01532dc533ecbcc01d3fa5fcec8a0abbf292e), [`1dba10a`](https://github.com/amplitude/rrweb/commit/1dba10a215ea873fd1663d77c58c783c9d8a0edc), [`e8a0ecd`](https://github.com/amplitude/rrweb/commit/e8a0ecd0268e599c17e97bcd91f94c44b04d79a0), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`f317df7`](https://github.com/amplitude/rrweb/commit/f317df792ba69ee33b7148f486dea8e77cfab42a), [`3ae57a6`](https://github.com/amplitude/rrweb/commit/3ae57a6d8803f4e076a448fa7e3967fa3c125487), [`3ef1e70`](https://github.com/amplitude/rrweb/commit/3ef1e709eb43b21505ed6bde405c2f6f83b0badc), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`4442d21`](https://github.com/amplitude/rrweb/commit/4442d21c5b1b6fb6dd6af6f52f97ca0317005ad8), [`9e9226f`](https://github.com/amplitude/rrweb/commit/9e9226fc00031dc6c2012dedcd53ec41db86b975)]:
  - @amplitude/rrweb@2.0.0-alpha.25
