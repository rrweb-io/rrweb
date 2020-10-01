# 异步加载数据

当录制的数据较多时，一次性加载至回放页面可能带来较大的网络开销和较长的等待时间。这时可以采取数据分页的方式，异步地加载数据并回放。

rrweb 中用于实现异步加载数据的 API 非常简单直观：

```js
const replayer = new rrweb.Replayer(events);

replayer.addEvent(NEW_EVENT);
```

只需要调用 `addEvent` 传入新的数据，rrweb 就会自动处理其中的时间关系，以最恰当的方式进行回放。

如果需要异步加载多个数据，只需这样使用：

```js
const replayer = new rrweb.Replayer(events);

for (const event of NEW_EVENTS) {
  replayer.addEvent(event);
}
```
