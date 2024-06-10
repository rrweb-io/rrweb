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

Distributed files have new filenames, paths and extensions. _Important: If you don't reference distributed files directly, for example you run `import rrweb from 'rrweb'` you won't notice a difference with this change._ However if you include rrweb files directly in a script tag, you might have to update that path to include a the `.umd.cjs` files instead. For example all `.js` files now use ES modules which can be used in modern browsers, node.js and bundlers that support ES modules. All a modules now also ship `.cjs` and `.umd.cjs` files. The `.umd.cjs` files are CommonJS modules that bundle all files together to make it easy to ship one file to browser environments (similar to the previous `.js` files). The `.cjs` files are CommonJS modules that can be used in older Node.js environments. Check the `package.json`'s `main` and `exports` field for the available files.
