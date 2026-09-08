# Custom events

After recording starts, call `record.addCustomEvent(tag, payload)` to add an event.
The tag is a string; the payload can be any serializable value.

```js
import { record } from '@rrweb/record';

const events = [];
record({ emit: (event) => events.push(event) });

record.addCustomEvent('submit-form', { name: 'Adam' });
```

Listen for custom events during replay:

```js
import { Replayer } from '@rrweb/replay';

const replayer = new Replayer(events);
replayer.on('custom-event', (event) => {
  console.log(event.data.tag, event.data.payload);
});
```

## Notes and captions in rrweb-player

Use the `annotation` tag with a caption or note payload.

### Captions

```js
// Set or replace the caption. Omitted action means 'set'.
record.addCustomEvent('annotation', {
  kind: 'caption',
  text: 'Choose a name for your project.',
});

record.addCustomEvent('annotation', {
  kind: 'caption',
  action: 'clear',
});
```

A caption stays visible until the next caption replaces or clears it. Explicit
`action: 'set'` is also valid. Seeking restores the caption for that replay time.
If actions share a timestamp, the last one in event order wins.

### Notes

```js
record.addCustomEvent('annotation', {
  kind: 'note',
  text: 'Saving also creates a default workspace.',
});
```

Hover or focus the timeline marker to open the note. Click the marker, or press
Enter or Space, to seek to its timestamp. Tab into the open text panel to scroll
with the keyboard; interacting with that panel does not seek. Escape dismisses it.

Notes do not change captions. Caption events do not create timeline markers.

### Player options

```js
new rrwebPlayer({
  target: document.body,
  props: {
    events,
    showCaptions: true,
    skipInactive: false,
    tags: {
      annotation: '#159461',
      'submit-form': '#21e676',
    },
  },
});
```

`showCaptions` defaults to `false`. Recordings with caption set events show a CC
button when the controls are visible. Use `skipInactive: false` for walkthroughs
to preserve pauses. The `tags` option sets marker colors; other custom-event tags
keep their usual tag tooltips.

Caption sets and notes require non-empty `text`. Clear requires no text.
Text supports line breaks, but not HTML or Markdown. The player ignores malformed
annotation payloads and unknown kinds or actions.

### TypeScript

```ts
import type { CustomEventAnnotation } from '@rrweb/types';

const annotation = {
  kind: 'caption',
  text: 'Your project is ready.',
} satisfies CustomEventAnnotation;

record.addCustomEvent('annotation', annotation);
```
