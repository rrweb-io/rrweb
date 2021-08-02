# console 录制和播放

从 v1.0.0 版本开始，我们以插件的形式增加了录制和播放控制台输出的功能。这个功能旨在为开发者提供更多的 bug 信息。对这项功能我们还提供了一些设置选项。

### 开启录制 console 功能

可以通过如下代码使用默认的配置选项

```js
rrweb.record({
  emit: emit(event) {
    // 如果要使用console来输出信息，请使用如下的写法
    const defaultLog = console.log["__rrweb_original__"] ? console.log["__rrweb_original__"] : console.log;
    defaultLog(event);
  },
  // 使用默认的配置选项
  plugins: [rrweb.getRecordConsolePlugin()],
});
```

**警告**: 在 emit 函数中你不应该直接调用 console.log 等函数，否则将会得到报错：`Uncaught RangeError: Maximum call stack size exceeded`。
你应该调用 console.log.\_\_rrweb_original\_\_()来避免错误。

你也可以定制录制 console 的选项

```js
rrweb.record({
  emit: emit(event) {
    // 如果要使用console来输出信息，请使用如下的写法
    const defaultLog = console.log["__rrweb_original__"] ? console.log["__rrweb_original__"] : console.log;
    defaultLog(event);
  },
  // 定制的选项
  plugins: [rrweb.getRecordConsolePlugin({
    level: ["info", "log", "warn", "error"],
    lengthThreshold: 10000,
    stringifyOptions: {
      stringLengthLimit: 1000,
      numOfKeysLimit: 100,
    },
    logger: window.console,
  })],
});
```

如下是配置选项的详细说明：
| key | 默认值 | 功能 |
| ---------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| level | ['log','warn','error',...] | 默认值包含了 console 的全部函数，你也可以传入想要录制的 console 函数。 |
| lengthThreshold | 1000 | 录制 console 输出信息的最大条数。 |
| stringifyOptions | { stringLengthLimit: undefined, numOfKeysLimit: 50 } | 如果 console 输出包含了 js 对象，我们需要对其进行序列化，`stringLengthLimit` 限制了单个值能转化的最大字符串长度，`numOfKeysLimit` 限制了一个被序列化的 js 对象能够包含的最大数量 key，如果对象的 key 数量超过了这个限制，我们将只保留对象的名字。你能通过这些选项来减小生成的 events 的体积。 |
| logger | window.console | 要录制的 console 对象，你也可以传入一个想要录制的其他 js 执行环境的 console 对象。 |

## 播放 console 数据

如果 replayer 传入的 events 中包含了 console 类型的数据，我们将自动播放这些数据。

```js
const replayer = new rrweb.Replayer(events, {
  plugins: [
    rrweb.getReplayConsolePlugin({
      level: ['info', 'log', 'warn', 'error'],
    }),
  ],
});
replayer.play();
```

如下是对 replay 选项的描述：

| key          | 默认值                                                                 | 功能                                                                                                        |
| ------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| level        | ['log','warn','error',...]                                             | 与 recordLog 设置选项的含义相同，你可以只播放想要的 console 函数类型                                        |
| replayLogger | 一个基于 console 的对接口[ReplayLogger](../../src/types.ts#L417)的实现 | 你也可以通过传入一个`ReplayLogger`接口的自己的实现，用 html 模拟一个浏览器控制台，来播放录制的 console 数据 |
