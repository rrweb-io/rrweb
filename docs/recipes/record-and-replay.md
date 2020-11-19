# Record And Replay

Record and Replay is the most common use case, which is suitable for any scenario that needs to collect user behaviors and replay them.

You only need a simple API call to record the website:

```js
const stopFn = rrweb.record({
  emit(event) {
    // save the event
  },
});
```

You can use any approach to store the recorded events, like sending the events to your backend and save them into the database.

But you should guarantee:

- a set of events are sorted by its timestamp
- save every event

You can use the `stopFn` to stop the recording.

The replay is also as simple as putting events into rrweb's Replayer.

```js
const events = GET_YOUR_EVENTS;

const replayer = new rrweb.Replayer(events);
replayer.play();
```
