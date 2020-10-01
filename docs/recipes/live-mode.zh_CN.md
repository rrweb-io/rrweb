# 实时回放（直播）

如果希望持续、实时地看到录制的数据，达到类似直播的效果，则可以使用实时回放 API。这个方式也适用于一些实时协同的场景。

使用 rrweb Replayer 进行实时回放时，需要传入 `liveMode: true` 配置，并通过 `startLive` API 启动直播模式。

```js
const replayer = new rrweb.Replayer([], {
  liveMode: true,
});

replayer.startLive(FIRST_EVENT.timestamp - BUFFER);
```

使用 `startLive` API 启动直播模式时，你可以传入一个可选参数，用于设置基线时间戳，这对于需要一定缓冲时间的直播场景非常有用。

例如录制时的第一个事件记录于 1500 这个时间点，实时回放时传入 `startLive(1500)` 就会让回放器将基线时间戳定为 1500，并用于计算后续事件的延迟时间。

但这有时会让实时回放看起来卡顿，因为数据的传输需要一定的时间（例如网络延迟），同时一些事件因为节流的性能优化会延迟发出（例如鼠标移动）。

因此我们可以通过 `startLive` 传入一个较小值的方式来提供一个缓冲时间，例如 `startLive(500)` 就会让回放总是延迟 1 秒播放。如果传输延迟小于 1 秒，则观看者不会感到卡顿。

启动直播模式后，可以通过 `addEvent` API 不断将最新的事件传入回放器中：

```js
replayer.addEvent(NEW_EVENT);
```
