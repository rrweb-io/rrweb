# Optimize The Storage Size

In some Apps, rrweb may record an unexpected amount of data. This part will help to find a suitable way to optimize the storage.

Currently, we have the following optimize strategies:

- block some DOM element to reduce the recording area
- use sampling config to reduce the events
- use deduplication and compression to reduce storage size

## Block DOM element

Some DOM elements may emit lots of events, and some of them may not be the thing user cares about. So you can use the block class to ignore these kinds of elements.

Some common patterns may emit lots of events are:

- long list
- complex SVG
- element with JS controlled animation
- canvas animations

## Sampling

Use the sampling config in the recording can reduce the storage size by dropping some events:

**Scenario 1**

```js
rrweb.record({
  emit(event) {},
  sampling: {
    // do not record mouse movement
    mousemove: false
    // do not record mouse interaction
    mouseInteraction: false
    // set the interval of scrolling event
    scroll: 150 // do not emit twice in 150ms
    // set the interval of media interaction event
    media: 800
    // set the timing of record input
    input: 'last' // When input mulitple characters, only record the final input
  }
})
```

**Scenario 2**

```js
rrweb.record({
  emit(event) {},
  sampling: {
    // Configure which kins of mouse interaction should be recorded
    mouseInteraction: {
      MouseUp: false,
      MouseDown: false,
      Click: false,
      ContextMenu: false,
      DblClick: false,
      Focus: false,
      Blur: false,
      TouchStart: false,
      TouchEnd: false,
    },
  },
});
```

## Compression

### Use packFn to compress every event

rrweb provides an fflate-based simple compress function in [@rrweb/packer](../../packages/packer/).

You can use it by passing it as the `packFn` in the recording.

```js
import { pack } from '@rrweb/packer';

rrweb.record({
  emit(event) {},
  packFn: rrweb.pack,
});
```

And you need to pass packer.unpack as the `unpackFn` in replaying.

```js
import { unpack } from '@rrweb/packer';

const replayer = new rrweb.Replayer(events, {
  unpackFn: rrweb.unpack,
});
```

### Compress the whole session

Use packFn to compress every event may not get the best result.

It's recommended to compress the whole session in the backend, which will have a more efficient compression ratio for some algorithms like deflate.

## Deduplication

Another optimizing strategy is deduplication.

Since we need to simulate hover in the replay, rrweb will try its best to inline CSS styles in the events.

So if we are applying rrweb to github.com, we may record many duplicate CSS styles across sessions.

We can iterate the events and extract CSS. Then we can only store one copy of the styles.

This strategy is also possible for the full snapshot across sessions.
