# Customize the Replayer

When rrweb's Replayer and the rrweb-playback-ui UI do not fit your need, you can customize your replayer UI.

There are several ways to do this:

1. Use rrweb-playback-ui, and customize its CSS.
2. Use rrweb-playback-ui, and set `showController: false` to hide the controller UI. With this config, you can implement your controller UI.
3. Use the `insertStyleRules` options to inject some CSS into the replay iframe.
4. Develop a new replayer UI with rrweb's Replayer.

## Implement Your Controller UI

When using rrweb-playback-ui, you can hide its controller UI:

```js
new rrwebPlaybackUi({
  target: document.body,
  props: {
    events,
    showController: false,
  },
});
```

When you are implementing a controller UI, you may need to interact with rrweb-playback-ui.

The follwing APIs show some common use case of a controller UI:

```js
// toggle between play and pause
rrwebPlaybackUi.toggle();
// play
rrwebPlaybackUi.play();
// pause
rrwebPlaybackUi.pause();
// update the dimension
rrwebPlaybackUi.$set({
  width: NEW_WIDTH,
  height: NEW_HEIGHT,
});
rrwebPlaybackUi.triggerResize();
// toggle whether to skip the inactive time
rrwebPlaybackUi.toggleSkipInactive();
// set replay speed
rrwebPlaybackUi.setSpeed(2);
// go to some timing
rrwebPlaybackUi.goto(3000);
```

And there are some ways to listen rrweb-playback-ui's state:

```js
// get current timing
rrwebPlaybackUi.addEventListener('ui-update-current-time', (event) => {
  console.log(event.payload);
});

// get current state
rrwebPlaybackUi.addEventListener('ui-update-player-state', (event) => {
  console.log(event.payload);
});

// get current progress
rrwebPlaybackUi.addEventListener('ui-update-progress', (event) => {
  console.log(event.payload);
});
```

## Develop a new replayer UI with rrweb's Replayer.

Please refer [rrweb-playback-ui](https://github.com/rrweb-io/rrweb/tree/master/packages/rrweb-playback-ui/).
