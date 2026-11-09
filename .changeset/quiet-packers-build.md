---
"@rrweb/packer": patch
---

Restore UMD output for mapless JavaScript entrypoints, including the combined packer entry emitted by Vite 8. Bundle dependencies into each UMD entry so packer, pack, and unpack can run independently in browsers. Internal shared chunks no longer receive UMD wrappers.
