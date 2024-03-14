# Custom Event

You may need to record some custom events along with the rrweb events, and let them be played as other events. The custom event API was designed for this.

After starting the recording, we can call the `record.addCustomEvent` API to add a custom event.

```js
// start recording
rrweb.record({
  emit(event) {
    ...
  }
})

// record some custom events at any time
rrweb.record.addCustomEvent('submit-form', {
  name: 'Adam', // This is the event name
  age: 18
})
rrweb.record.addCustomEvent('some-error', {
  name: "I am some error", // This is event name
  error
})
```

`addCustomEvent` accepts two parameters. The first one is a string-type `tag`, while the second one is an any-type `payload`. To set event name set as `payload` as following `{name: "Event name"}`

During the replay, we can add an event listener to custom events, or configure the style of custom events in rrweb-player's timeline.

**Listen to custom events**

```js
const replayer = new rrweb.Replayer(events);

replayer.on('custom-event', (event) => {
  console.log(event.tag, event.payload);
});
```

**Display in rrweb-player**

```js
new rrwebPlayer({
  target: document.body,
  props: {
    events,
    // configure the color of tag which will be displayed on the timeline
    // You can now group event names by specific tag color.
    tags: {
      'submit-form': '#21e676',
      'some-error': 'red',
    },
  },
});
```
