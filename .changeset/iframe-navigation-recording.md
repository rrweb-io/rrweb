---
"rrweb": patch
"@rrweb/record": patch
---

修复 iframe 从同源文档导航到跨域页面后录制事件无法转发的问题，并避免子文档导航时停止其他文档中的 Shadow DOM 采集。
