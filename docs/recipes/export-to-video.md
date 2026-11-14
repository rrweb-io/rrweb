# Convert To Video

The event data recorded by rrweb is a performant, easy to compress, text-based format. And the replay is also pixel perfect.

But if you really need to convert it into a video format, there are some tools that can do this work.

Use [rrvideo](../../packages/rrvideo/README.md).

For high-fps or MP4 output, use the ffmpeg backend
(`--output session.mp4 --fps 60`). Playwright `recordVideo` is CDP
screencast and typically tops out around 25fps WebM.
