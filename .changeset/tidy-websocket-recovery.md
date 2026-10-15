---
"@rrweb/browser-client": patch
---

Resume recording uploads after WebSocket reconnections and keep HTTP fallback retries active after disconnects or server errors. Preserve buffered events when a fallback network request fails, prevent overlapping periodic uploads, and clean up polling when recording stops or freezes.
