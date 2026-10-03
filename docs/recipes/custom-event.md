# Custom events

After recording starts, call `record.addCustomEvent(tag, payload)` to add an event.
The tag is a string; the payload can be any serializable value.

```js
import { record } from '@rrweb/record';

const events = [];
record({ emit: (event) => events.push(event) });

record.addCustomEvent('submit-form', { name: 'Adam' });
record.addCustomEvent('some-error', { message: 'Could not submit the form.' });
```

Listen for custom events during replay:

```js
import { Replayer } from '@rrweb/replay';

const replayer = new Replayer(events);
replayer.on('custom-event', (event) => {
  console.log(event.data.tag, event.data.payload);
});
```

## Display in rrweb-player

Custom events appear as timeline markers in rrweb-player. Hover over a marker to
see its tag. Use the `tags` option to configure a color for each custom-event tag.

```js
import rrwebPlayer from 'rrweb-player';

new rrwebPlayer({
  target: document.body,
  props: {
    events,
    tags: {
      'submit-form': '#21e676',
      'some-error': 'red',
    },
  },
});
```

For captions and timeline markers, use the separate
[annotations API](./annotations.md).
