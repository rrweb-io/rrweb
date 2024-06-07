---
"@rrweb/all": major
"@rrweb/packer": major
"@rrweb/rrweb-plugin-canvas-webrtc-record": major
"@rrweb/rrweb-plugin-canvas-webrtc-replay": major
"@rrweb/rrweb-plugin-console-record": major
"@rrweb/rrweb-plugin-console-replay": major
"@rrweb/rrweb-plugin-sequential-id-record": major
"@rrweb/rrweb-plugin-sequential-id-replay": major
"@rrweb/record": major
"@rrweb/replay": major
"rrdom": major
"rrdom-nodejs": major
"rrweb": major
"rrweb-player": major
"rrweb-snapshot": major
"@rrweb/types": major
---

Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference. If you include rrweb in a script tag and referred to a `.js` file, you'll now have to update that path to include a `.umd.cjs` file. Distributed files have new paths, filenames and extensions. All packages now no longer include a `.js` files, instead they include `.cjs`, `.umd.cjs` and `.mjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments. The `.mjs` files are ES modules that can be used in modern browsers, node.js and bundlers that support ES modules. The `.cjs` files are CommonJS modules that can be used in older Node.js environments.
