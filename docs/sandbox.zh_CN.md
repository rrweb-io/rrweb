# 沙盒

在[序列化设计](./serialization.zh_CN.md)中我们提到了“去脚本化”的处理，即在回放时我们不应该执行被录制页面中的 JavaScript，在重建快照的过程中我们将所有 `script` 标签改写为 `noscript` 标签解决了部分问题。但仍有一些脚本化的行为是不包含在 `script` 标签中的，例如 HTML 中的 inline script、表单提交等。

脚本化的行为多种多样，如果仅过滤已知场景难免有所疏漏，而一旦有脚本被执行就可能造成不可逆的非预期结果。因此我们通过 HTML 提供的 iframe 沙盒功能进行浏览器层面的限制。

## iframe sandbox

我们在重建快照时将被录制的 DOM 重建在一个 `iframe` 元素中，通过设置它的 `sandbox` 属性，我们可以禁止以下行为：

- 表单提交
- `window.open` 等弹出窗
- JS 脚本（包含 inline event handler 和 `<URL>` ）

这与我们的预期是相符的，尤其是对 JS 脚本的处理相比自行实现会更加安全、可靠。

## 避免链接跳转

当点击 a 元素链接时默认事件为跳转至它的 href 属性对应的 URL。在重放时我们会通过重建跳转后页面 DOM 的方式保证视觉上的正确重放，而原本的跳转则应该被禁止执行。

通常我们会通过事件代理捕获所有的 a 元素点击事件，再通过 `event.preventDefault()` 禁用默认事件。但当我们将回放页面放在沙盒内时，所有的 event handler 都将不被执行，我们也就无法实现事件代理。

重新查看我们回放交互事件增量快照的实现，我们会发现其实 `click` 事件是可以不被重放的。因为在禁用 JS 的情况下点击行为并不会产生视觉上的影响，也无需被感知。

不过为了优化回放的效果，我们可以在点击时给模拟的鼠标元素添加特殊的动画效果，用来提示观看者此处发生了一次点击。

## iframe 样式设置

由于我们将 DOM 重建在 iframe 中，所以我们无法通过父页面的 CSS 样式表影响 iframe 中的元素。但是在不允许 JS 脚本执行的情况下 `noscript` 标签会被显示，而我们希望将其隐藏，就需要动态的向 iframe 中添加样式，示例代码如下：

```typescript
const injectStyleRules: string[] = [
  'iframe { background: #f1f3f5 }',
  'noscript { display: none !important; }',
];

const styleEl = document.createElement('style');
const { documentElement, head } = this.iframe.contentDocument!;
documentElement!.insertBefore(styleEl, head);
for (let idx = 0; idx < injectStyleRules.length; idx++) {
  (styleEl.sheet! as CSSStyleSheet).insertRule(injectStyleRules[idx], idx);
}
```

需要注意的是这个插入的 style 元素在被录制页面中并不存在，所以我们不能将其序列化，否则 `id -> Node` 的映射将出现错误。
