# 自定义事件

录制时可能需要在特定的时间点记录一些特定含义的数据，如果希望这部分数据作为回放时的一部分，则可以通过自定义事件的方式实现。

开始录制后，我们就可以通过 `record.addCustomEvent` API 添加自定义事件：

```js
// 开始录制
rrweb.record({
  emit(event) {
    ...
  }
})

// 在开始录制后的任意时间点记录自定义事件，例如：
rrweb.record.addCustomEvent('submit-form', {
  name: '姓名',
  age: 18
})
rrweb.record.addCustomEvent('some-error', {
  error
})
```

`addCustomEvent` 接收两个参数，第一个是字符串类型的 `tag`，第二个是任意类型的 `payload`。

在回放时我们可以通过监听事件获取对应的事件，也可以通过配置 rrweb-playback-ui 在回放器 UI 的时间轴中展示对应事件。

**获取对应事件**

```js
const replayer = new rrweb.Replayer(events);

replayer.on('custom-event', (event) => {
  console.log(event.tag, event.payload);
});
```

**在 rrweb-playback-ui 中展示**

```js
new rrwebPlaybackUi({
  target: document.body,
  props: {
    events,
    // 自定义各个 tag 在时间轴上的色值
    tags: {
      'submit-form': '#21e676',
      'some-error': 'red',
    },
  },
});
```
