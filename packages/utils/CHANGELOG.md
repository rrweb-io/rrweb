# @rrweb/utils

## 3.0.0

## 2.0.1

### Patch Changes

- [#1854](https://github.com/rrweb-io/rrweb/pull/1854) [`5f52d63`](https://github.com/rrweb-io/rrweb/commit/5f52d63636b3246bd5b6ba99a93cba41c5d981cb) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Fix broken MutationObserver in Webkit/Safari when a webpage has been monkey patched by a 3rd party library

## 2.0.0

### Patch Changes

- [#1840](https://github.com/rrweb-io/rrweb/pull/1840) [`6db8f71`](https://github.com/rrweb-io/rrweb/commit/6db8f71033ec289e4550f76b4864b94c118d9ea5) Thanks [@Juice10](https://github.com/Juice10)! - Add the rrweb browser client package and move `nowTimestamp` into `@rrweb/utils` so the client can avoid importing through `rrweb/utils`.

- [#1631](https://github.com/rrweb-io/rrweb/pull/1631) [`88ea2d0`](https://github.com/rrweb-io/rrweb/commit/88ea2d05c1869026111c91f7aa14ea7a7193fcd8) Thanks [@pauldambra](https://github.com/pauldambra)! - Move patch function into @rrweb/utils to improve bundling

- [#1704](https://github.com/rrweb-io/rrweb/pull/1704) [`33e01f5`](https://github.com/rrweb-io/rrweb/commit/33e01f5f005580cbab23d2d4c60dd25c0245d8f0) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Provide a /umd/ output folder alongside the /dist/ one so that we can serve UMD (Universal Module Definition) files with a .js extension, without upsetting expectations set by package.json that all .js files in /dist/ are modules

- [#1509](https://github.com/rrweb-io/rrweb/pull/1509) [`be6bf52`](https://github.com/rrweb-io/rrweb/commit/be6bf52c248c35de1b3491e3a3440ff61f876414) Thanks [@Juice10](https://github.com/Juice10)! - Reverse monkey patch built in methods to support LWC (and other frameworks like angular which monkey patch built in methods).

- [#1763](https://github.com/rrweb-io/rrweb/pull/1763) [`6388fb5`](https://github.com/rrweb-io/rrweb/commit/6388fb5a468e1a860ab8bb5c6826c811dcc3100c) Thanks [@wfk007](https://github.com/wfk007)! - fix: wujie monkeypatches ownerDocument

## 2.0.0-alpha.20

### Patch Changes

- [#1763](https://github.com/rrweb-io/rrweb/pull/1763) [`6388fb5`](https://github.com/rrweb-io/rrweb/commit/6388fb5a468e1a860ab8bb5c6826c811dcc3100c) Thanks [@wfk007](https://github.com/wfk007)! - fix: wujie monkeypatches ownerDocument

## 2.0.0-alpha.19

### Patch Changes

- [#1631](https://github.com/rrweb-io/rrweb/pull/1631) [`88ea2d0`](https://github.com/rrweb-io/rrweb/commit/88ea2d05c1869026111c91f7aa14ea7a7193fcd8) Thanks [@pauldambra](https://github.com/pauldambra)! - Move patch function into @rrweb/utils to improve bundling

## 2.0.0-alpha.18

## 2.0.0-alpha.17

### Patch Changes

- [#1509](https://github.com/rrweb-io/rrweb/pull/1509) [`be6bf52`](https://github.com/rrweb-io/rrweb/commit/be6bf52c248c35de1b3491e3a3440ff61f876414) Thanks [@Juice10](https://github.com/Juice10)! - Reverse monkey patch built in methods to support LWC (and other frameworks like angular which monkey patch built in methods).
