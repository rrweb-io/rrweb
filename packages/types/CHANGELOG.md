# @rrweb/types

## 2.0.0-alpha.26

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.26

## 2.0.0-alpha.25

### Major Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307) Thanks [@jxiwang](https://github.com/jxiwang)! - Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference. If you include rrweb in a script tag and referred to a `.js` file, you'll now have to update that path to include a `.umd.cjs` file. Distributed files have new paths, filenames and extensions. All packages now no longer include a `.js` files, instead they include `.cjs`, `.umd.cjs` and `.mjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments. The `.mjs` files are ES modules that can be used in modern browsers, node.js and bundlers that support ES modules. The `.cjs` files are CommonJS modules that can be used in older Node.js environments.

### Minor Changes

- [#43](https://github.com/amplitude/rrweb/pull/43) [`3ae57a6`](https://github.com/amplitude/rrweb/commit/3ae57a6d8803f4e076a448fa7e3967fa3c125487) Thanks [@jxiwang](https://github.com/jxiwang)! - Support top-layer <dialog> components. Fixes #1381.

### Patch Changes

- Updated dependencies [[`becf687`](https://github.com/amplitude/rrweb/commit/becf687910a21be618c8644642673217d75a4bfe), [`178f1e6`](https://github.com/amplitude/rrweb/commit/178f1e6e450e0903e9dadc4dc96dd74236f296ba), [`3ae57a6`](https://github.com/amplitude/rrweb/commit/3ae57a6d8803f4e076a448fa7e3967fa3c125487), [`0749d4c`](https://github.com/amplitude/rrweb/commit/0749d4c0d5ec0fb75b82db935d9cc8466645b307), [`6676611`](https://github.com/amplitude/rrweb/commit/6676611aa9ef5ef777d55289d7887293965e317f), [`3ef1e70`](https://github.com/amplitude/rrweb/commit/3ef1e709eb43b21505ed6bde405c2f6f83b0badc), [`4442d21`](https://github.com/amplitude/rrweb/commit/4442d21c5b1b6fb6dd6af6f52f97ca0317005ad8), [`9e9226f`](https://github.com/amplitude/rrweb/commit/9e9226fc00031dc6c2012dedcd53ec41db86b975)]:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.25

## 2.0.0-alpha.24

### Patch Changes

- Updated dependencies [[`d4dacd5`](https://github.com/amplitude/rrweb/commit/d4dacd507dfa8f7719ae6e136042843ba47b7302), [`e3c831c`](https://github.com/amplitude/rrweb/commit/e3c831c5442fc5d213f3a02dba8b746c9c87d37d)]:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.24

## 2.0.0-alpha.23

### Patch Changes

- Updated dependencies [[`9f0fb7c`](https://github.com/amplitude/rrweb/commit/9f0fb7c53f6910a33a69a843a8773e939f42b0fa), [`0983ef8`](https://github.com/amplitude/rrweb/commit/0983ef8c952ff0038e555e4147e008d2fb174248), [`88a15cf`](https://github.com/amplitude/rrweb/commit/88a15cf221f245a9e98ca0b074e7abced5798c5b), [`6d5cbf0`](https://github.com/amplitude/rrweb/commit/6d5cbf098d3322a9d2e29df0664d199025332e2a)]:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.23

## 2.0.0-alpha.22

### Patch Changes

- [#22](https://github.com/amplitude/rrweb/pull/22) [`87cba12`](https://github.com/amplitude/rrweb/commit/87cba12ebbc2da78671c16be6932c10b4c1cbb6d) Thanks [@jxiwang](https://github.com/jxiwang)! - Add `loop` to `mediaInteractionParam`

- [#22](https://github.com/amplitude/rrweb/pull/22) [`21278b5`](https://github.com/amplitude/rrweb/commit/21278b54b57f16e98b05923103e82b77b2eda19f) Thanks [@jxiwang](https://github.com/jxiwang)! - Fix type error when using `"moduleResolution": "NodeNext"`.

- Updated dependencies [[`87cba12`](https://github.com/amplitude/rrweb/commit/87cba12ebbc2da78671c16be6932c10b4c1cbb6d), [`a1d5962`](https://github.com/amplitude/rrweb/commit/a1d596254aa12bd85295f7c759ed28637cdffa04), [`ffdf49c`](https://github.com/amplitude/rrweb/commit/ffdf49c6e9f44177f80b320efdbfdb85a4da0756), [`ba7f3d5`](https://github.com/amplitude/rrweb/commit/ba7f3d50e982d6d2e5c1dd4868a536db5d3572e9)]:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.22

## 2.0.0-alpha.21

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.21

## 2.0.0-alpha.20

### Patch Changes

- Updated dependencies [[`5b85646`](https://github.com/amplitude/rrweb/commit/5b85646a9557c89d594c6a484f576fbdb0c38eb7)]:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.20

## 2.0.0-alpha.19

### Patch Changes

- Updated dependencies [[`f876ea5`](https://github.com/amplitude/rrweb/commit/f876ea55e21653d682a983b320f611d9ab09e0ad)]:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.19

## 2.0.0-alpha.18

### Patch Changes

- Updated dependencies [[`66c6fcb`](https://github.com/amplitude/rrweb/commit/66c6fcbf213694f8a6ff4784cec1e9b1320ae429)]:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.18

## 2.0.0-alpha.17

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.17

## 2.0.0-alpha.16

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.16

## 2.0.0-alpha.15

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.15

## 2.0.0-alpha.14

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.14

## 2.0.0-alpha.13

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.13

## 2.0.0-alpha.12

### Patch Changes

- Updated dependencies []:
  - @amplitude/rrweb-snapshot@2.0.0-alpha.12

## 2.0.0-alpha.11

### Patch Changes

- [#1287](https://github.com/rrweb-io/rrweb/pull/1287) [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7) Thanks [@Juice10](https://github.com/Juice10)! - Upgrade all projects to typescript 4.9.5

- Updated dependencies [[`11f6567`](https://github.com/rrweb-io/rrweb/commit/11f6567fd81ef9ed0f954a7b6d5e39653f56004f), [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7), [`efdc167`](https://github.com/rrweb-io/rrweb/commit/efdc167ca6c039d04af83612e3d92498bb9b41a7)]:
  - rrweb-snapshot@2.0.0-alpha.11

## 2.0.0-alpha.10

### Patch Changes

- [#1268](https://github.com/rrweb-io/rrweb/pull/1268) [`d872d28`](https://github.com/rrweb-io/rrweb/commit/d872d2809e3ec8d6ff5d3d5f43bc81aff70e7548) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Compact style mutation fixes and improvements

  - fixes when style updates contain a 'var()' on a shorthand property #1246
  - further ensures that style mutations are compact by reverting to string method if it is shorter

- Updated dependencies [[`c6600e7`](https://github.com/rrweb-io/rrweb/commit/c6600e742b8ec0b6295816bb5de9edcd624d975e)]:
  - rrweb-snapshot@2.0.0-alpha.10

## 2.0.0-alpha.9

### Patch Changes

- Updated dependencies [[`d7c72bf`](https://github.com/rrweb-io/rrweb/commit/d7c72bff0724b46a6fa94af455220626a27104fe)]:
  - rrweb-snapshot@2.0.0-alpha.9

## 2.0.0-alpha.8

### Minor Changes

- [#1129](https://github.com/rrweb-io/rrweb/pull/1129) [`979d2b1`](https://github.com/rrweb-io/rrweb/commit/979d2b1847a3d05e2731722952e4d6bd8be54f40) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - click events now include a `.pointerType` attribute which distinguishes between ['pen', 'mouse' and 'touch' events](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType). There is no new PenDown/PenUp events, but these can be detected with a MouseDown/MouseUp + pointerType=pen

### Patch Changes

- Updated dependencies [[`bc84246`](https://github.com/rrweb-io/rrweb/commit/bc84246f78849a80dbb8fe9b4e76117afcc5c3f7), [`d0fdc0f`](https://github.com/rrweb-io/rrweb/commit/d0fdc0f273bb156a1faab4782b40fbec8dccf915)]:
  - rrweb-snapshot@2.0.0-alpha.8

## 2.0.0-alpha.7

### Patch Changes

- Updated dependencies [[`d2582e9`](https://github.com/rrweb-io/rrweb/commit/d2582e9a81197130cd93bc1dd778e16fddfb0be3), [`e7f0c80`](https://github.com/rrweb-io/rrweb/commit/e7f0c808c3f348fb27d1acd5fa300a5d92b14d00)]:
  - rrweb-snapshot@2.0.0-alpha.7

## 2.0.0-alpha.6

### Patch Changes

- Updated dependencies [[`c28ef5f`](https://github.com/rrweb-io/rrweb/commit/c28ef5f658abb93086504581409cf7a376db48dc), [`f6f07e9`](https://github.com/rrweb-io/rrweb/commit/f6f07e953376634a4caf28ff8cbfed5a017c4347), [`eac9b18`](https://github.com/rrweb-io/rrweb/commit/eac9b18bbfa3c350797b99b583dd93a5fc32b828), [`8e47ca1`](https://github.com/rrweb-io/rrweb/commit/8e47ca1021ebb4fc036b37623ef10abf7976d6dd)]:
  - rrweb-snapshot@2.0.0-alpha.6

## 2.0.0-alpha.5

### Patch Changes

- Updated dependencies [[`1385f7a`](https://github.com/rrweb-io/rrweb/commit/1385f7acc0052f83be1458a7b00e18c026ee393f), [`227d43a`](https://github.com/rrweb-io/rrweb/commit/227d43abb93d57cadc70c760b28c46911bf7d8ff)]:
  - rrweb-snapshot@2.0.0-alpha.5
