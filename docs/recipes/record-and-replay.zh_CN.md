# 录制与回放

录制与回放时最常用的使用方式，适用于任何需要采集用户行为数据并重新查看的场景。

仅需一个函数调用就可以录制当前页面：

```js
const stopFn = rrweb.record({
  emit(event) {
    // 保存获取到的 event 数据
  }
})
```

你可以使用任何方式保存录制的数据，例如通过网络请求将数据传入至后端持久化保存，但请确保：

- 一组录制的数据按照 event.timestamp 中的时间戳从小至大保存
- 完整保存数据，不缺失任何一个 event。

如果需要手动停止录制，可以调用返回的 `stopFn` 函数。

回放时只需要获取一段录制数据，并传入 rrweb 提供的 Replayer：

```js
const events = GET_YOUR_EVENTS

const replayer = new rrweb.Replayer(events);
replayer.play();
```

