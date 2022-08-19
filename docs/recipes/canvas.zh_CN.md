# Canvas

Canvas 是一种特殊的 HTML 元素，默认情况下其内容不会被 rrweb 观测。我们可以通过特定的配置让 rrweb 能够录制并回放 Canvas。

录制时包含 Canvas 内的内容：

```js
rrweb.record({
  emit(event) {},
  // 对 canvas 进行录制
  recordCanvas: true,
});
```

或者启用每秒 15 帧的 Canvas 图像快照记录：

```js
rrweb.record({
  emit(event) {},
  recordCanvas: true,
  sampling: {
    canvas: 15,
  },
  // 图像的格式
  dataURLOptions: {
   type: 'image/webp',
   quality: 0.6
  }
});
```

回放时对 Canvas 进行回放：

```js
const replayer = new rrweb.Replayer(events, {
  UNSAFE_replayCanvas: true,
});
replayer.play();
```

**回放 Canvas 将会关闭沙盒策略，导致一定风险**。
