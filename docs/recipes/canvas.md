# Canvas

Canvas is a special HTML element, and will not be recorded by rrweb by default.
There are some options for recording and replaying Canvas.

Enable recording Canvas：

```js
rrweb.record({
  emit(event) {},
  recordCanvas: true,
});
```

Alternatively enable image snapshot recording of Canvas at a maximum of 15 frames per second：

```js
rrweb.record({
  emit(event) {},
  recordCanvas: true,
  sampling: {
    canvas: 15,
  },
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

Alternatively you can stream canvas elements via webrtc with the canvas-webrtc plugin.
For more information see [canvas-webrtc documentation](../../packages/rrweb/src/plugins/canvas-webrtc/Readme.md)
