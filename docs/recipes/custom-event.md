# Custom Event

You may need to record some custom events along with the rrweb events, and let them be played as other events. The custom event API was designed for this.

After starting the recording, we can call the `record.addCustomEvent` API to add a custom event.

```js
import { record } from '@rrweb/record';

// start recording
record({
  emit(event) {
    ...
  }
})

// record some custom events at any time
record.addCustomEvent('submit-form', {
  name: 'Adam',
  age: 18
})
record.addCustomEvent('some-error', {
  error
})
```

`addCustomEvent` accepts two parameters. The first one is a string-type `tag`, while the second one is an any-type `payload`.

During the replay, we can add an event listener to custom events, or configure the style of custom events in rrweb-player's timeline.

**Listen to custom events**

```js
import { Replayer } from '@rrweb/replay';

const replayer = new Replayer(events);

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
    tags: {
      'submit-form': '#21e676',
      'some-error': 'red',
    },
  },
});
```

## Notes and captions in rrweb-player

Use the `annotation` tag for player annotations. Captions persist until replaced
or explicitly cleared; notes belong to a single moment on the timeline. The
recording API and event format stay the same.

### Set or clear a caption

```js
// Before starting an action. Omitted action defaults to 'set'.
record.addCustomEvent('annotation', {
  kind: 'caption',
  text: 'Choose a name for your project.',
});

// Replace the caption when the action finishes. Explicit 'set' is also valid.
record.addCustomEvent('annotation', {
  kind: 'caption',
  action: 'set',
  text: 'Your project is ready.',
});

// Remove the current caption.
record.addCustomEvent('annotation', {
  kind: 'caption',
  action: 'clear',
});
```

No duration estimate is needed while recording. The recorded timestamps of set
and clear events determine how long each caption is displayed. The latest valid
caption action at or before the replay time determines the caption, including
when seeking backward. At identical timestamps, the last action in event order
wins. A clear takes effect at its timestamp and never restores an older caption.
Without a later set or clear, a caption remains visible through the end of the
recording. Pauses, playback speed changes, and restarts follow replay time.

### Add a hover note

```js
record.addCustomEvent('annotation', {
  kind: 'note',
  text: 'Saving also creates a default workspace.',
});
```

Notes appear on hover or keyboard focus. Click the marker, or press Enter or
Space, to seek to its timestamp. Escape dismisses the note. Notes do not replace
or clear captions. Caption actions do not create timeline markers; emit a
separate note if the same moment should also have a hover note. Other custom
event tags keep their existing tag tooltips.

### Configure the player

```js
new rrwebPlayer({
  target: document.body,
  props: {
    events,
    showCaptions: true,
    skipInactive: false,
    tags: { annotation: '#159461' },
  },
});
```

`showCaptions` defaults to `false`. When caption set events exist, a CC button
lets viewers show or hide captions without hiding notes. Captions also work
with `showController: false`, but the CC button is then hidden. For walkthroughs,
use `skipInactive: false` so otherwise inactive time is not sped through.

Set captions and notes require non-empty string `text`. Clear requires no text.
Unknown kinds or actions and malformed annotation payloads are ignored. Payloads
under other tags are never interpreted as player annotations. Both captions and
notes display plain text with line breaks; HTML and Markdown are not interpreted.
`player.addEvent()` can add annotations after creation. Packed recordings are
also supported.

TypeScript recording authors can import the payload union:

```ts
import type { CustomEventAnnotation } from '@rrweb/types';

const annotation = {
  kind: 'caption',
  text: 'Your project is ready.\nInvite your team next.',
} satisfies CustomEventAnnotation;

record.addCustomEvent('annotation', annotation);
```
