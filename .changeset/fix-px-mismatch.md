---
"rrweb": patch
"@rrweb/record": patch
---

Fix #1920 - normalization of '0px' in style sheets caused problems with the styled-components library, which built style elements text element by text element. Bug introduced in #1640
