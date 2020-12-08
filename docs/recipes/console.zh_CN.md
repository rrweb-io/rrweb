# console 录制和播放

从v0.9.11的下一个版本开始，我们增加了录制和播放控制台输出的功能。这个功能旨在为开发者提供更多的bug信息。对这项功能我们还提供了一些设置选项。

### 开启录制console功能
可以通过如下代码使用默认的配置选项
```js
rrweb.record({
  emit: emit(event) {
    // 如果要使用console来输出信息，请使用如下的写法
    const defaultLog = console.log["__rrweb_original__"]?console.log["__rrweb_original__"]:console.log;
    defaultLog(event);
  },
  // 使用默认的配置选项
  recordLog: true,
});
```

**警告**: 在emit函数中你不应该直接调用console.log等函数，否则将会得到报错：`Uncaught RangeError: Maximum call stack size exceeded`。
你应该调用console.log.\_\_rrweb_original__()来避免错误。

你也可以定制录制console的选项
```js
rrweb.record({
  emit: emit(event) {
    // 如果要使用console来输出信息，请使用如下的写法
    const defaultLog = console.log["__rrweb_original__"]?console.log["__rrweb_original__"]:console.log;
    defaultLog(event);
  },
  // 定制的选项
  recordLog: {
    level: ["info", "log", "warn", "error"],
    lengthThreshold: 10000,
    stringifyOptions: {
      stringLengthLimit: 1000,
      numOfKeysLimit: 100,
    },
    logger: window.console,
  },
});
```
如下是配置选项的详细说明：
| key              | 默认值                                                            | 功能                                                                                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| level            | ['log','warn','error',...]                                        | 默认值包含了console的全部函数，你也可以传入想要录制的console函数。                                                                                                                                                                                                                 |
| lengthThreshold  | 1000                                                              | 录制console输出信息的最大条数。                                                                                                                                                                                                                                                    |
| stringifyOptions | {        stringLengthLimit: undefined,       numOfKeysLimit: 50 } | 如果console输出包含了js对象，我们需要对其进行序列化，`stringLengthLimit` 限制了单个值能转化的最大字符串长度，`numOfKeysLimit` 限制了一个被序列化的js对象能够包含的最大数量key，如果对象的key数量超过了这个限制，我们将只保留对象的名字。你能通过这些选项来减小生成的events的体积。 |
| logger           | window.console                                                    | 要录制的console对象，你也可以传入一个想要录制的其他js执行环境的console对象。                                                                                                                                                                                                       |

## 播放console数据
如果replayer传入的events中包含了console类型的数据，我们将自动播放这些数据。

```js
const replayer = new rrweb.Replayer(events, {
  logConfig: {
    level: ["info", "log", "warn", "error"]
  },
});
replayer.play();
```
如下是对replay选项的描述：

| key          | 默认值                                                               | 功能                                                                                                    |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| level        | ['log','warn','error',...]                                           | 与recordLog设置选项的含义相同，你可以只播放想要的console函数类型                                        |
| replayLogger | 一个基于console的对接口[ReplayLogger](../../src/types.ts#L417)的实现 | 你也可以通过传入一个`ReplayLogger`接口的自己的实现，用html模拟一个浏览器控制台，来播放录制的console数据 |