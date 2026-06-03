# @rrweb/all

Convenience package that includes a bundle of rrweb packages.
For most new integrations, prefer `@rrweb/record` + `@rrweb/replay` first, and use `@rrweb/all` when you want a single-package setup.

| Use case                                            | Package choice                    |
| --------------------------------------------------- | --------------------------------- |
| Most new apps (explicit record/replay dependencies) | `@rrweb/record` + `@rrweb/replay` |
| Quick setup with one import                         | `@rrweb/all`                      |
| Legacy compatibility                                | `rrweb`                           |

In most production setups, recorder and replayer are deployed to different pages/apps. Use `@rrweb/record` on recorded pages and `@rrweb/replay` (or `rrweb-player`) on replay pages. Use `@rrweb/all` when you intentionally want one package for convenience (for example demos, tooling, or simplified setups).

Includes the following packages:

- [rrweb](../rrweb)
- [@rrweb/record](../record)
- [@rrweb/replay](../replay)
- [@rrweb/packer](../packer)

## Installation

### 1) Bundler / npm

```bash
npm install @rrweb/all
```

```js
import { record, Replayer, pack, unpack } from '@rrweb/all';
import '@rrweb/all/dist/style.css';
```
