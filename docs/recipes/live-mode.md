# Real-time Replay (Live Mode）

If you want to replay the events in a real-time way, you can use the live mode API. This API is also useful for some real-time collaboration usage.

When you are using rrweb's Replayer to do a real-time replay, you need to configure `liveMode: true` and call the `startLive` API to enable the live mode.

```js
const replayer = new rrweb.Replayer([], {
  liveMode: true,
});
replayer.startLive();
```

Later when you receive new events (e.g. over websockets), you can add them using:

```
function onReceive(event) {
  replayer.addEvent(event);
}
```

If you have an ongoing recording that already has events, and wish to initiate play from a 'live' time, it's also possible to use the `play` function, supplied with an offset which corresponds to the current time:

```js
const replayer = new rrweb.Replayer(EXISTING_EVENTS, {
  liveMode: true,
});
replayer.play(Date.now() - EXISTING_EVENTS[0].timestamp);
```

When calling the `startLive` API, there is an optional parameter to set the baseline time. By default, this is `Date.now()` so that events are applied as soon as they come in, however this may cause your replay to appear laggy. Because data transportation needs time (such as the delay of the network), And some events have been throttled(such as mouse movements) which has a delay by default.

Here is how you introduce a buffer:

```js
const BUFFER_MS = 1000;
replayer.startLive(Date.now() - BUFFER_MS);
```

This will let the replay always delay 1 second than the source. If the time of data transportation is not longer than 1 second, the user will not feel laggy.

The same can be done for `play` as follows: `replayer.play((Date.now() - EXISTING_EVENTS[0].timestamp) - BUFFER_MS)`
