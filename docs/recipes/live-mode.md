# Real-time Replay (Live Mode）

If you want to replay the events in a real-time way, you can use the live mode API. This API is also useful for some real-time collaboration usage.

When you are using rrweb's Replayer to do a real-time replay, you need to configure `liveMode: true` and call the `startLive` API to enable the live mode.

```js
const replayer = new rrweb.Replayer([], {
  liveMode: true,
});

replayer.startLive(FIRST_EVENT.timestamp - BUFFER);
```

When calling the `startLive` API, there is an optional parameter to set the baseline time. This is quite useful when you live scenario needs a buffer time.

For example, you have an event recorded at timestamp 1500. Calling `startLive(1500)` will set the baseline time to 1500 and all the timing calculation will be based on this.

But this may cause your replay to look laggy. Because data transportation needs time(such as the delay of the network). And some events have been throttled(such as mouse movements) which has a delay by default.

So we can configure a smaller baseline time to the `startLive` API, like `startLive(500)`. This will let the replay always delay 1 second than the source. If the time of data transportation is not longer than 1 second, the user will not feel laggy.

When live mode is on, we can call `addEvent` API to add the latest events into the replayer:

```js
replayer.addEvent(NEW_EVENT);
```
