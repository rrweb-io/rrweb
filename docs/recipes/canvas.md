# Canvas

Canvas is a special HTML element, which will not be recorded by rrweb by default. There are some options for recording and replaying Canvas.

Enable recording Canvas：

```js
rrweb.record({
  emit(event) {},
  recordCanvas: true,
});
```

Enable replaying Canvas：

```js
const replayer = new rrweb.Replayer(events, {
  UNSAFE_replayCanvas: true,
});
replayer.play();
```

**Enable replaying Canvas will remove the sandbox, which may cause a potential security issue.**
