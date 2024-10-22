---
"@amplitude/rrweb-all": major
"@amplitude/rrweb-packer": major
"@amplitude/rrweb-plugin-canvas-webrtc-record": major
"@amplitude/rrweb-plugin-canvas-webrtc-replay": major
"@amplitude/rrweb-plugin-console-record": major
"@amplitude/rrweb-plugin-console-replay": major
"@amplitude/rrweb-plugin-sequential-id-record": major
"@amplitude/rrweb-plugin-sequential-id-replay": major
"@amplitude/rrweb-record": major
"@amplitude/rrweb-replay": major
"@amplitude/rrdom": major
"@amplitude/rrdom-nodejs": major
"@amplitude/rrweb": major
"@amplitude/rrweb-player": major
"@amplitude/rrweb-snapshot": major
"@amplitude/rrweb-types": major
---

Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference. If you include rrweb in a script tag and referred to a `.js` file, you'll now have to update that path to include a `.umd.cjs` file. Distributed files have new paths, filenames and extensions. All packages now no longer include a `.js` files, instead they include `.cjs`, `.umd.cjs` and `.mjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments. The `.mjs` files are ES modules that can be used in modern browsers, node.js and bundlers that support ES modules. The `.cjs` files are CommonJS modules that can be used in older Node.js environments.
