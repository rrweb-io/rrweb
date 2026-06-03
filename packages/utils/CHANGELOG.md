# @rrweb/utils

## 1.1.1

## 1.1.0

### Patch Changes

- [#8](https://github.com/newrelic-forks/rrweb/pull/8) [`52da172`](https://github.com/newrelic-forks/rrweb/commit/52da1729040a5a086920879b782ff641bce636bf) Thanks [@ptang-nr](https://github.com/ptang-nr)! - load unpatched versions of things from Angular zone when present (non-Safari browsers only)

- [#1704](https://github.com/rrweb-io/rrweb/pull/1704) [`33e01f5`](https://github.com/newrelic-forks/rrweb/commit/33e01f5f005580cbab23d2d4c60dd25c0245d8f0) Thanks [@eoghanmurray](https://github.com/eoghanmurray)! - Provide a /umd/ output folder alongside the /dist/ one so that we can serve UMD (Universal Module Definition) files with a .js extension, without upsetting expectations set by package.json that all .js files in /dist/ are modules

- [#1763](https://github.com/rrweb-io/rrweb/pull/1763) [`6388fb5`](https://github.com/newrelic-forks/rrweb/commit/6388fb5a468e1a860ab8bb5c6826c811dcc3100c) Thanks [@wfk007](https://github.com/wfk007)! - fix: wujie monkeypatches ownerDocument

## 1.0.1

### Patch Changes

- [#19](https://github.com/newrelic-forks/rrweb/pull/19) [`0834a85`](https://github.com/newrelic-forks/rrweb/commit/0834a85a181ed7003fd2303e9a9582764d266c0e) Thanks [@cwli24](https://github.com/cwli24)! - Version alignment: bump lockstep group to 1.0.1 (no functional code changes).

## 2.0.0-alpha.18

## 2.0.0-alpha.17

### Patch Changes

- [#1509](https://github.com/rrweb-io/rrweb/pull/1509) [`be6bf52`](https://github.com/rrweb-io/rrweb/commit/be6bf52c248c35de1b3491e3a3440ff61f876414) Thanks [@Juice10](https://github.com/Juice10)! - Reverse monkey patch built in methods to support LWC (and other frameworks like angular which monkey patch built in methods).
