# 自定义回放 UI

当 rrweb Replayer 和 rrweb-player 的 UI 不能满足需求时，可以通过自定义回放 UI 制作属于你自己的回放器。

你可以通过以下几种方式从不同角度自定义回放 UI：

1. 使用 rrweb-player 时，通过覆盖 CSS 样式表定制 UI。
2. 使用 rrweb-player 时，通过 `showController: false` 隐藏控制器 UI，重新实现控制器 UI。
3. 通过 `insertStyleRules` 在回放页面（iframe）内定制 CSS 样式。
4. 基于 rrweb Replayer 开发自己的回放器 UI。

## 实现控制器 UI

使用 rrweb-player 时，可以隐藏其控制器 UI：

```js
new rrwebPlayer({
  target: document.body,
  props: {
    events,
    showController: false,
  },
});
```

实现自己的控制器 UI 时，你可能需要与 rrweb-player 进行交互。

通过 API 控制 rrweb-player：

```js
// 在播放和暂停间切换
rrwebPlayer.toggle();
// 播放
rrwebPlayer.play();
// 暂停
rrwebPlayer.pause();
// 更新 rrweb-player 宽高
rrwebPlayer.$set({
  width: NEW_WIDTH,
  height: NEW_HEIGHT,
});
rrwebPlayer.triggerResize();
// 切换否跳过无操作时间
rrwebPlayer.toggleSkipInactive();
// 设置播放速度为 2 倍
rrwebPlayer.setSpeed(2);
// 跳转至播放 3 秒处
rrwebPlayer.goto(3000);
```

通过监听事件获得 rrweb-player 的状态：

```js
// 当前播放时间
rrwebPlayer.addEventListener('ui-update-current-time', (event) => {
  console.log(event.detail.payload);
});

// 当前播放状态
rrwebPlayer.addEventListener('ui-update-player-state', (event) => {
  console.log(event.detail.payload);
});

// 当前播放进度
rrwebPlayer.addEventListener('ui-update-progress', (event) => {
  console.log(event.detail.payload);
});
```

## 基于 rrweb Replayer 开发自己的回放器 UI

可以参照 [rrweb-player](https://github.com/rrweb-io/rrweb-player) 的方式进行开发。
