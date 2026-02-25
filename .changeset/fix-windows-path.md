---
"@rrweb/all": patch
---

Fix Windows build failure caused by hardcoded Unix path separators in vite.config.default.ts. The minifyAndUMDPlugin now uses cross-platform path handling with regex to match both forward and backward slashes, and uses path.sep for generating platform-specific paths.
