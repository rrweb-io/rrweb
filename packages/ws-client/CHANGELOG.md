# @rrwebcloud/js-client

## 2.0.0-alpha.22

### Major Changes

- [#10](https://github.com/rrweb-cloud/rrweb/pull/10) [`79bd4a5`](https://github.com/rrweb-cloud/rrweb/commit/79bd4a504e28afb6e90b4352d08c82dada4a8783) Thanks [@Juice10](https://github.com/Juice10)! - refactor: rename `publicAPIkey` to `publicApiKey` in `.start()`

## 2.0.0-alpha.21

### Minor Changes

- [#8](https://github.com/rrweb-cloud/rrweb/pull/8) [`20f7a0b`](https://github.com/rrweb-cloud/rrweb/commit/20f7a0b9fb6285a846239de204336eb21c008aca) Thanks [@Juice10](https://github.com/Juice10)! - Implement public API key support for authenticating WebSocket connections and POST data requests.

## 2.0.0-alpha.20

### Minor Changes

- [#6](https://github.com/rrweb-cloud/rrweb/pull/6) [`0317a0f`](https://github.com/rrweb-cloud/rrweb/commit/0317a0f2e8d331a5f945d48a3f2dbeb474e127f9) Thanks [@Juice10](https://github.com/Juice10)! - Export functions and types to allow named imports. The package now supports both default and named imports:

  - `import { start, addMeta, addPageviewMeta, addCustomEvent, getRecordingId } from '@rrwebcloud/js-client'`
  - `import { clientConfig, nameValues } from '@rrwebcloud/js-client'` (types)
  - `import client from '@rrwebcloud/js-client'` (then use `client.start()`, `client.addMeta()`, etc.)

### Patch Changes

- [#6](https://github.com/rrweb-cloud/rrweb/pull/6) [`266fbf4`](https://github.com/rrweb-cloud/rrweb/commit/266fbf4adf852d415739dfd0319c53f32b9ee2e4) Thanks [@Juice10](https://github.com/Juice10)! - Use correct path for bundled file names

## 2.0.0-alpha.19

### Patch Changes

- [#2](https://github.com/rrweb-cloud/rrweb/pull/2) [`10b3edf`](https://github.com/rrweb-cloud/rrweb/commit/10b3edf7793cc192256a1b2794b759d85930c702) Thanks [@Juice10](https://github.com/Juice10)! - Release @rrwebcloud/js-client

- Updated dependencies [[`dc20cd4`](https://github.com/rrweb-cloud/rrweb/commit/dc20cd45cc63058325784444af6bd32ed2cace48), [`3e9e42f`](https://github.com/rrweb-cloud/rrweb/commit/3e9e42fdfd6349087d7a0345af1b39dd56528502), [`a6893f7`](https://github.com/rrweb-cloud/rrweb/commit/a6893f73abe217a95d28996e01b7ec8261e42de3), [`88ea2d0`](https://github.com/rrweb-cloud/rrweb/commit/88ea2d05c1869026111c91f7aa14ea7a7193fcd8), [`fc390a9`](https://github.com/rrweb-cloud/rrweb/commit/fc390a954c4fc17fe2ee0e2b6edba634611349e0), [`85281ca`](https://github.com/rrweb-cloud/rrweb/commit/85281ca7a1e65113586e66e781afcdaaffb1ff41), [`79837ac`](https://github.com/rrweb-cloud/rrweb/commit/79837ac8f2f459935f6737210890b5c12033a53b), [`6f4e691`](https://github.com/rrweb-cloud/rrweb/commit/6f4e691f39cc59b655d1be4f951128beecb88acb), [`9cd28b7`](https://github.com/rrweb-cloud/rrweb/commit/9cd28b703ec08a77dc6b790dbffb20dfb8e9a513), [`9914f87`](https://github.com/rrweb-cloud/rrweb/commit/9914f87dd5810a9cafa75cc7b6045dd30fe566e9)]:
  - rrweb@2.0.0-alpha.19
  - @rrweb/record@2.0.0-alpha.19
  - @rrweb/utils@2.0.0-alpha.19
  - @rrweb/types@2.0.0-alpha.19
