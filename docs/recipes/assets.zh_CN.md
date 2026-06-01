# 静态资源录制

静态资源录制会把外部资源记录为 `Asset` 事件，并关联到发现该资源的快照或 mutation。回放时，rrweb 会在重建对应快照时应用这些资源，因此即使原始 URL 不可访问或内容已变化，也可以回放图像、媒体和样式表。

在 `record` 中使用 `captureAssets`：

```js
import { record } from '@rrweb/record';

record({
  emit(event) {},
  captureAssets: {
    objectURLs: true,
    origins: ['https://static.example.com'],
    images: true,
    video: false,
    audio: false,
    stylesheets: 'without-fetch',
    processStylesheetsWithin: 2000,
    stylesheetsRuleThreshold: 0,
  },
});
```

## Asset 事件

Asset 事件会在发现它的 `FullSnapshot` 或 `IncrementalSnapshot` 之后发出。事件时间戳可能晚于关联的快照，但回放时仍会把它应用到对应的快照上。

对于样式表，rrweb 可以异步处理 CSS 规则并将结果发为 Asset 事件。这样可以避免在初始快照路径上同步执行较重的样式表序列化，同时在资源可用时仍能让回放先应用捕获到的样式表。

## 配置项

`captureAssets` 是一个对象，包含以下字段：

- `objectURLs`（默认值：`true`）：录制通过 `URL.createObjectURL()` 创建的同源 `blob:` 资源。
- `origins`（默认值：`false`）：选择 rrweb 录制哪些 URL origin。使用 `false` 或 `[]` 关闭基于 origin 的录制，使用 `true` 录制任意 origin，或使用 `['https://static.example.com']` 这样的数组指定允许的 origin。
- `images`：即使图片 origin 不匹配 `origins`，也录制图片资源。未设置时，只有匹配 `origins` 的图片会被录制。`inlineImages: true` 会映射为 `captureAssets.images: true`。
- `video`：即使视频 origin 不匹配 `origins`，也录制视频资源。未设置时，只有匹配 `origins` 的视频会被录制。
- `audio`：即使音频 origin 不匹配 `origins`，也录制音频资源。未设置时，只有匹配 `origins` 的音频会被录制。
- `stylesheets`：控制样式表资源录制。使用 `false` 关闭，使用 `'without-fetch'` 录制浏览器已经可访问 CSS 规则的样式表，使用 `true` 时在需要时也会 fetch 样式表 URL。启用样式表录制时，包括 `'without-fetch'` 模式，配置的 `origins` 可以允许对匹配的样式表 URL 进行 fetch 录制。
- `processStylesheetsWithin`（默认值：`2000`）：异步处理样式表的最长延迟，单位为毫秒。较低的值可以降低短访问在样式表 Asset 发出前卸载页面的概率。设置为 `0` 或负数会同步处理，但可能阻塞主线程。
- `stylesheetsRuleThreshold`（默认值：`0`）：规则数少于该阈值的样式表会立即处理并放入快照，而不是作为单独的 Asset 事件发出。

## 旧的 inline 配置

`inlineImages` 和 `inlineStylesheet` 仍然可以作为兼容配置使用，但新的集成应使用 `captureAssets`。

- `inlineImages: true` 会在 `captureAssets.images` 未设置时映射为 `captureAssets.images: true`。
- `inlineStylesheet: 'all'` 映射为 `captureAssets.stylesheets: true`。
- `inlineStylesheet: true` 映射为 `captureAssets.stylesheets: 'without-fetch'`。
- `inlineStylesheet: false` 映射为 `captureAssets.stylesheets: false`。

直接调用 `rrweb-snapshot` 时，历史 inline 行为仍会保留。以上映射适用于 `record`。
