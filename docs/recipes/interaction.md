# Interact With UI During Replay

By default, the UI could not interact during replay. But you can use API to enable/disable this programmatically.

```js
const replayer = new rrweb.Replayer(events);

// enable user interact with the UI
replayer.enableInteract();

// disable user interact with the UI
replayer.disableInteract();
```

rrweb uses the `pointer-events: none` CSS property to disable interaction.

This will let the replay more stable and avoid some problems like navigate by clicking an external link.

If you want to enable user interaction, like input, then you can use the `enableInteract` API. But be sure you have handled the problems that may cause unstable replay.
