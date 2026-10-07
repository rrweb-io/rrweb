# Annotations

Annotations have their own event type, separate from custom events. After recording
starts, use `record.addAnnotation()` to add captions or timeline markers.

```js
import { record } from '@rrweb/record';

const events = [];
record({ emit: (event) => events.push(event) });
```

## Captions

```js
// Set or replace the caption.
record.addAnnotation({
  type: 'caption',
  text: 'Choose a name for your project.',
});

// Clear the caption. Use an empty string, null, or false.
record.addAnnotation({ type: 'caption', text: '' });
```

A caption stays visible until the next caption replaces or clears it. Seeking
restores the caption for that replay time. If annotations share a timestamp, the
last one in event order wins.

## Timeline markers

```js
record.addAnnotation({
  type: 'timelineMarker',
  text: 'Saving also creates a default workspace.',
});
```

Hover or focus the timeline marker to open its text panel. Click the marker, or
press Enter or Space, to seek to its timestamp. Tab into the open text panel to
scroll with the keyboard; interacting with that panel does not seek. Escape
dismisses it.

Timeline markers do not change captions. Caption events do not create timeline
markers.

## Replay callbacks

```js
import { Replayer } from '@rrweb/replay';

const replayer = new Replayer(events);
replayer.on('annotation', (event) => {
  console.log(event.data.type, event.data.text);
});
```

The callback receives the full annotation event, including its timestamp, when
replay casts it. Applications can use it to render their own annotation UI.
Seeking can skip events before the latest metadata event, so custom renderers
that keep captions visible must also reconstruct caption state from the recording
at the seek time. rrweb-player does this automatically.

## Player options

```js
import rrwebPlayer from 'rrweb-player';

new rrwebPlayer({
  target: document.body,
  props: {
    events,
    showCaptions: true,
    skipInactive: false,
    timelineMarkerColor: '#159461',
  },
});
```

`showCaptions` defaults to `true`; set it to `false` to hide captions initially.
Recordings with nonempty captions show a CC
button when the controls are visible. For tutorials, use `skipInactive: false`
to preserve pauses that give viewers time to read. Annotations do not count as
user activity, so skipping inactive periods can shorten the time a caption is
visible.

`timelineMarkerColor` sets annotation marker colors and defaults to
`rgb(73, 80, 246)`. For ordinary custom-event marker colors, see the
[custom-event recipe](./custom-event.md#display-in-rrweb-player).

To clear captions, use `text: ''`, `text: null`, or `text: false`. Timeline markers
require nonempty text. Missing text, whitespace-only strings, other value types,
and unknown annotation types are ignored by the player.

Text supports line breaks and is rendered as plain text. HTML and Markdown are
not interpreted. The player renders captions outside the replay iframe, so they
remain readable as the replay scales.

## Keyboard controls

The playback position slider is also keyboard accessible. Tab to it and use the
Left and Right arrow keys to seek five seconds, or Home and End to jump to the
start or end of the recording.

## TypeScript

```ts
import type { annotationData } from '@rrweb/types';

const annotation = {
  type: 'caption',
  text: 'Your project is ready.',
} satisfies annotationData;

record.addAnnotation(annotation);
```
