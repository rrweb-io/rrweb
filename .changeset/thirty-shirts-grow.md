---
"all": patch
"packer": patch
"plugins": patch
"record": patch
"replay": patch
"rrdom": patch
"rrdom-nodejs": patch
"rrweb": patch
"rrweb-player": patch
"rrweb-snapshot": patch
"types": patch
"utils": patch
---

Provide a /umd/ output folder alongside the /dist/ one so that we can serve UMD (Universal Module Definition) files with a .js extension, without upsetting expectations set by package.json that all .js files in /dist/ are modules
