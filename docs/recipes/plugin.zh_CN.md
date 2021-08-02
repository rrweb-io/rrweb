# 插件

插件 API 的设计目标是在不增加 rrweb 核心部分大小和复杂性的前提下，扩展 rrweb 的功能。

## 接口

与 rrweb 其它功能相似，插件可以包含同时包含录制、回放侧的功能，也可以只实现其中任一。

```ts
export type RecordPlugin<TOptions = unknown> = {
  name: string;
  observer: (cb: Function, options: TOptions) => listenerHandler;
  options: TOptions;
};

export type ReplayPlugin = {
  handler: (
    event: eventWithTime,
    isSync: boolean,
    context: { replayer: Replayer },
  ) => void;
};
```

以上是录制和回放插件的接口类型。

### 示例

#### 录制侧插件

```ts
const exampleRecordPlugin: RecordPlugin<{ foo: string }> = {
  name: 'my-scope/example@1',
  observer(cb, options) {
    const timer = setInterval(() => {
      cb({
        foo: options.foo,
        timestamp: Date.now(),
      });
    }, 1000);
    return () => clearInterval(timer);
  },
  options: {
    foo: 'bar',
  },
};

rrweb.record({
  emit: emit(event) {},
  plugins: [exampleRecordPlugin],
});
```

在这个示例中，录制侧插件将会输出这样的事件：

```js
{
  type: 6,
  data: {
    plugin: 'my-scope/example@1',
    payload: {
      foo: 'bar',
      timestamp: 1624693882345,
    },
  },
  timestamp: 1624693882345,
}
```

#### 回放侧插件

```ts
const exampleReplayPlugin: ReplayPlugin = {
  handler(event, isSync, context) {
    if (event.type === EventType.Plugin) {
      // 使用 event.data.payload
      if (event.data.plugin === 'my-scope/example@1') {
        // 处理示例插件录制的数据
      }
    }
  },
};

const replayer = new rrweb.Replayer(events, {
  plugins: [exampleReplayPlugin],
});
```

回放侧插件可以通过 `context.replayer` 与播放器进行交互。

## 插件命名

录制侧插件应该拥有全局唯一的名称，并且其名称会被记录在输出的事件中。

**由于会同时存在 rrweb 仓库中的官方插件与用户自行实现的自定义插件，所以我们推荐使用统一的命名规则避免冲突，命名方式如下：**

> scope/name@version

例如： `rrweb/console@1` 或 `github/pr@2`。
