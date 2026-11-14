---
"rrvideo": minor
---

Add an ffmpeg capture backend that seeks the rrweb replayer per output frame, screenshots, and pipes JPEGs into libx264. Use this for high-fps / high-resolution MP4 export; Playwright `recordVideo` remains available but is still limited by CDP screencast (~25fps WebM). `transformMany` runs sessions in parallel.
