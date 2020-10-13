# 回放时与 UI 交互

回放时的 UI 默认不可交互，但在特定场景下也可以通过 API 允许用户与回放场景进行交互。

```js
const replayer = new rrweb.Replayer(events);

// 允许用户在回放的 UI 中进行交互
replayer.enableInteract();

// 禁用用户在回放的 UI 中进行交互
replayer.disableInteract();
```

rrweb 使用 CSS 的 `pointer-events: none` 属性禁用交互。

这能够让回放更加稳定，例如避免用户点击回放中的超链接发生跳转等。

如果你希望允许用户交互，例如用户可以在回放时在输入框中进行输入，那么就可以调用 `enableInteract` API，但需要对不稳定的场景自行加以处理。
