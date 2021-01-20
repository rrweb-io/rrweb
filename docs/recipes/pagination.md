# Load Events Asynchronous

When the size of the recorded events increased, load them in one request is not performant. You can paginate the events and load them as you need.

rrweb's API for loading async events is quite simple:

```js
const replayer = new rrweb.Replayer(events);

replayer.addEvent(NEW_EVENT);
```

When calling the `addEvent` API to add a new event, rrweb will resolve its timestamp and replay it as need.

If you need to load several events, you can do a lool like this:

```js
const replayer = new rrweb.Replayer(events);

for (const event of NEW_EVENTS) {
  replayer.addEvent(event);
}
```
