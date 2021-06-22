# Customize the Replayer

When rrweb's Replayer and the rrweb-player UI do not fit your need, you can customize your replayer UI.

There are several ways to do this:

1. Use rrweb-player, and customize its CSS.
2. Use rrweb-player, and set `showController: false` to hide the controller UI. With this config, you can implement your controller UI.
3. Use the `insertStyleRules` options to inject some CSS into the replay iframe.
4. Develop a new replayer UI with rrweb's Replayer.

## Implement Your Controller UI

When using rrweb-player, you can hide its controller UI:

```js
new rrwebPlayer({
  target: document.body,
  props: {
    events,
    showController: false,
  },
});
```

When you are implementing a controller UI, you may need to interact with rrweb-player.

The follwing APIs show some common use case of a controller UI:

```js
// toggle between play and pause
rrwebPlayer.toggle();
// play
rrwebPlayer.play();
// pause
rrwebPlayer.pause();
// update the dimension
rrwebPlayer.$set({
  width: NEW_WIDTH,
  height: NEW_HEIGHT,
});
rrwebPlayer.triggerResize();
// toggle whether to skip the inactive time
rrwebPlayer.toggleSkipInactive();
// set replay speed
rrwebPlayer.setSpeed(2);
// go to some timing
rrwebPlayer.goto(3000);
```

And there are some ways to listen rrweb-player's state:

```js
// get current timing
rrwebPlayer.addEventListener('ui-update-current-time', (event) => {
  console.log(event.payload);
});

// get current state
rrwebPlayer.addEventListener('ui-update-player-state', (event) => {
  console.log(event.payload);
});

// get current progress
rrwebPlayer.addEventListener('ui-update-progress', (event) => {
  console.log(event.payload);
});
```

## Develop a new replayer UI with rrweb's Replayer.

Please refer [rrweb-player](https://github.com/rrweb-io/rrweb-player).
