# console recorder and replayer

Starting with a later version of v0.9.11, we add the ability to record and play back console output. 
This feature aims to provide developers with more information about the bug scene. There are some options for recording and replaying console output.

### Enable recording console
You can enable the logger using default option like this:
```js
rrweb.record({
  emit: emit(event) {
    // you should use console.log in this way to avoid errors.
    const defaultLog = console.log["__rrweb_original__"]?console.log["__rrweb_original__"]:console.log;
    defaultLog(event);
  },
  // to use default record option
  recordLog: true,
});
```

**alert**: You shouldn't call console.log(warn, error .etc) in the emit function or you would get the error: `Uncaught RangeError: Maximum call stack size exceeded`.
You should call console.log.\_\_rrweb_original__() instead.

You can also customize the behavior of logger like this:
```js
rrweb.record({
  emit: emit(event) {
    // you should use console.log in this way to avoid errors.
    const defaultLog = console.log["__rrweb_original__"]?console.log["__rrweb_original__"]:console.log;
    defaultLog(event);
  },
  // customized options
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
All recordLog options are described below:
| key              | default                                                           | description                                                                                                                                                                                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| level            | ['log','warn','error',...]                                        | Default value contains names of all console functions. You can override it by setting console levels you need.                                                                                                                                                                                                                          |
| lengthThreshold  | 1000                                                              | Maximum number of records of console output.                                                                                                                                                                                                                                                                                            |
| stringifyOptions | {        stringLengthLimit: undefined,       numOfKeysLimit: 50 } | If console output includes js objects, we need to stringify them. `stringLengthLimit` limits the string length of single value. `numOfKeysLimit` limits the number of keys in an object. If an object contains more keys than this limit, we would only save object's name. You can reduce the size of events by setting these options. |
| logger           | window.console                                                    | the console object we would record.You can set a console object from another execution environment where you would like to record.                                                                                                                                                                                                      |

## replay console
If recorded events include data of console log type, we will automatically play them.

```js
const replayer = new rrweb.Replayer(events, {
  logConfig: {
    level: ["info", "log", "warn", "error"]
  },
});
replayer.play();
```

Description of replay option is as follows:

| key          | default                                                                                      | description                                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| level        | ['log','warn','error',...]                                                                   | Same meaning as that option in recordLog. You can set this option to play levels of log you need.                                                      |
| replayLogger | a console based object that implements the interface [ReplayLogger](../../src/types.ts#L417) | You can also set a replay logger to replay the log messages in a simulated browser console like LogRocket by implementing the interface `ReplayLogger` |