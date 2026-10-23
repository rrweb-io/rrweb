# Canvas

Canvas 是一种特殊的 HTML 元素，默认情况下其内容不会被 rrweb 观测。我们可以通过特定的配置让 rrweb 能够录制并回放 Canvas。

录制时包含 Canvas 内的内容：

```js
import { record } from '@rrweb/record';

record({
  emit(event) {},
  // 对 canvas 进行录制
  recordCanvas: true,
});
```

或者启用每秒 15 帧的 Canvas 图像快照记录：

```js
import { record } from '@rrweb/record';

record({
  emit(event) {},
  recordCanvas: true,
  sampling: {
    canvas: 15,
  },
  // 图像的格式
  dataURLOptions: {
    type: 'image/webp',
    quality: 0.6,
  },
});
```

回放时对 Canvas 进行回放：

```js
import { Replayer } from '@rrweb/replay';

const replayer = new Replayer(events, {
  UNSAFE_replayCanvas: true,
});
replayer.play();
```

**启用 canvas 回放会向回放 iframe 添加 `allow-scripts`，并退出 rrweb 沙盒的脚本执行保护。仅在你接受该风险的回放数据上使用 `UNSAFE_replayCanvas`。**

另外，您可以使用 [rrweb-plugin-canvas-webrtc-record](../../packages/plugins/rrweb-plugin-canvas-webrtc-record/) 和 [rrweb-plugin-canvas-webrtc-replay](../../packages/plugins/rrweb-plugin-canvas-webrtc-replay) 插件通过 WebRTC 流式传输 Canvas 元素。
有关更多信息，请参考 [canvas-webrtc 文档](../../packages/plugins/rrweb-plugin-canvas-webrtc-record/README.md)。
