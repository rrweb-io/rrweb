# Plugin

The plugin API is designed to extend the function of rrweb without bump the size and complexity of rrweb's core part.

# Available plugins

 - [@rrweb/rrweb-plugin-console-record](packages/plugins/rrweb-plugin-console-record): A plugin for recording console logs.
 - [@rrweb/rrweb-plugin-console-replay](packages/plugins/rrweb-plugin-console-replay): A plugin for replaying console logs.
 - [@rrweb/rrweb-plugin-sequential-id-record](packages/plugins/rrweb-plugin-sequential-id-record): A plugin for recording sequential IDs.
 - [@rrweb/rrweb-plugin-sequential-id-replay](packages/plugins/rrweb-plugin-sequential-id-replay): A plugin for replaying sequential IDs.
 - [@rrweb/rrweb-plugin-canvas-webrtc-record](packages/plugins/rrweb-plugin-canvas-webrtc-record): A plugin for stream `<canvas>` via WebRTC.
 - [@rrweb/rrweb-plugin-canvas-webrtc-replay](packages/plugins/rrweb-plugin-canvas-webrtc-replay): A plugin for playing streamed `<canvas>` via WebRTC.

## Interface

Same to with other functionality in rrweb, a plugin can implement record or replay or both features.

```ts
export type RecordPlugin<TOptions = unknown> = {
  name: string;
  observer: (cb: Function, options: TOptions) => listenerHandler;
  options: TOptions;
};

export type ReplayPlugin = {
  handler: (
    event: eventWithTime,
    isSync: boolean,
    context: { replayer: Replayer },
  ) => void;
};
```

Both record and replay plugins have a type interface.

### example

#### record plugin

```ts
const exampleRecordPlugin: RecordPlugin<{ foo: string }> = {
  name: 'my-scope/example@1',
  observer(cb, options) {
    const timer = setInterval(() => {
      cb({
        foo: options.foo,
        timestamp: Date.now(),
      });
    }, 1000);
    return () => clearInterval(timer);
  },
  options: {
    foo: 'bar',
  },
};

rrweb.record({
  emit: emit(event) {},
  plugins: [exampleRecordPlugin],
});
```

In this example, the record plugin will emit events like this:

```js
{
  type: 6,
  data: {
    plugin: 'my-scope/example@1',
    payload: {
      foo: 'bar',
      timestamp: 1624693882345,
    },
  },
  timestamp: 1624693882345,
}
```

#### replay plugin

```ts
const exampleReplayPlugin: ReplayPlugin = {
  handler(event, isSync, context) {
    if (event.type === EventType.Plugin) {
      // do something with event.data.payload
      if (event.data.plugin === 'my-scope/example@1') {
        // handle example plugin data
      }
    }
  },
};

const replayer = new rrweb.Replayer(events, {
  plugins: [exampleReplayPlugin],
});
```

A replay plugin can interact with the replayer by using `context.replayer`.

## naming a plugin

A record plugin should have a unique name, and it will be stored in the event it emits.

**Since we will have both plugins in the rrweb repo and plugins in users' own codebase, which may cause naming conflicts in the future, we strongly recommended users naming their own plugins in this way:**

> scope/name@version

For example `rrweb/console@1` or `github/pr@2`.
