# rrweb 中的录制静态资源的方法和配置

[rrweb](https://rrweb.io/) 是一个 JavaScript 库，允许您录制并回放您网页上的用户操作。它为录制静态资源（如图像）提供了各种配置选项。在本文档中，我们将探讨 rrweb 中不同的录制静态资源的方法及其配置选项。

## 静态资源事件

静态资源（Asset）是一种新的事件类型，它承载了在快照过程中捕获的某个 http 资源的序列化版本。常见的例子有图像、媒体文件和样式表。资源既可以从外部获取（在 href 的情况下从缓存中获取），也可以在内部获取（对于 `blob:` URL 和同源样式表）。静态资源事件会在 FullSnapshot 或 IncrementalSnapshot（mutation）之后发出，尽管它们的时间戳可能更晚，但在回放时它们会作为其所关联快照的一部分被重建。例如，如果某个样式表在 FullSnapshot 时被引用但尚未下载完成，之后可能会有一个时间戳更晚的 mutation 事件，它与静态资源事件一起可以重现样式表因网络延迟而加载的体验。

## 用静态资源来缓解样式表处理开销

对于样式表，rrweb 在录制时会进行一些处理以序列化 css 规则，这会对初始页面加载时间以及 FullSnapshot 的生成速度产生负面影响（参见 https://pagespeed.web.dev/ ）。现在这些处理已被移出主线程，改为异步处理并（最多在 `processStylesheetsWithin` 毫秒后）发出。只要样式表已成功发出，回放端就没有相应的延迟。

## 录制静态资源配置

`captureAssets` 配置选项允许您自定义录制静态资源的过程。它是一个具有以下属性的对象：

- `objectURLs`（默认值：`true`）：此属性指定是否使用 object URL 录制同源 `blob:` 资源。Object URL 是使用 `URL.createObjectURL()` 方法创建的。将 `objectURLs` 设置为 `true` 可以启用对象 URL 的录制。

- `origins`（默认值：`false`）：此属性确定录制哪些域名的资源。它可以有以下值：

  - `false` 或 `[]`：除了 object URL、样式表（除非设置为 false）和图像（如果该设置已开启）之外，不录制任何静态资源。
  - `true`：从所有来源录制资源。
  - `[origin1, origin2, ...]`：仅从指定的来源录制资源。例如，`origins: ['https://s3.example.com/']` 表示录制来自 `https://s3.example.com/` 的所有静态资源。

- `images`（默认值：如果 rrweb.record 配置中 `inlineImages` 为 true，则默认为 `true`）：设置为 true 时，无论图像来源如何，都会开启对所有图像的静态资源录制。设置为 false 时，即使来源匹配也不会录制任何图像。默认情况下，如果图像的 src url 匹配上面的 `origins` 设置（包括 `origins` 设置为 `true` 的情况），图像就会被录制。

- `video`：设置为 true 时，无论视频来源如何，都会开启对视频的静态资源录制。设置为 false 时，即使来源匹配也不会录制任何视频。默认情况下，如果视频的 src url 匹配上面的 `origins` 设置（包括 `origins` 设置为 `true` 的情况），视频就会被录制。

- `audio`：设置为 true 时，无论音频文件来源如何，都会开启对音频文件的静态资源录制。设置为 false 时，即使来源匹配也不会录制任何音频文件。默认情况下，如果音频文件的 src url 匹配上面的 `origins` 设置（包括 `origins` 设置为 `true` 的情况），音频文件就会被录制。

- `stylesheets`（默认值：`'without-fetch'`）：设置为 `true` 时，无论来源如何，都会通过静态资源系统开启对所有样式表和 style 元素的录制。默认值 `'without-fetch'` 旨在与之前的 `inlineStylesheet` 行为保持一致，而 `true` 值则允许通过 fetch 调用（通常会使用浏览器缓存）来录制那些因 CORS 限制而无法访问的样式表。如果某个样式表匹配上面的 `origins` 配置，那么无论此配置项如何设置，它都会被录制（直接录制或通过 fetch 录制）。

- `stylesheetsRuleThreshold`（默认值：`0`）：仅对规则数超过此值的样式表调用静态资源系统。默认值为零（而不是比如 100），因为它只查看“外层”规则（例如，一条 media 规则内部可能嵌套了数千条子规则）。此默认值可能会根据反馈进行调整。

- `processStylesheetsWithin`（默认值：`2000`）：此属性定义了浏览器在处理样式表之前应延迟的最长时间（以毫秒为单位）。内联 `<style>` 元素会在此值的一半时间内被处理。如果您希望提高短时“跳出”访问在访客卸载页面前发出静态资源的几率，可以降低此值。设置为零或负数会同步处理样式表，这可能导致在比如 https://pagespeed.web.dev/ 上得分较差（“第三方代码阻塞了主线程”），并且也会导致静态资源以比其所关联快照更早的时间戳被发出。

- `adoptedStylesheetAssets`（默认值：`false`）：设置为 `true` 时，被采用的（构造的）样式表的 css 内容会作为一个单独的 `asset` 事件发出，并通过 `assetUrls` 虚拟 url（样式表的 id 嵌入在每个 url 中）从被采用样式表事件中引用，而不是作为 css 规则内联。这样可以对在许多被采用样式表之间共享的 css 进行去重（每个唯一的样式表只发出/存储一次静态资源），并使增量快照事件保持较小。在回放时，样式表会从静态资源中被重建。

## TypeScript 类型定义

这是 `recordOptions` 对象的 TypeScript 类型定义，其中包括录制静态资源的配置选项：

```typescript
export type recordOptions<T> = {
  // 其他配置选项...
  captureAssets?: {
    objectURLs: boolean;
    origins: string[] | true | false;
    images: boolean;
    stylesheets: boolean | 'without-fetch';
    processStylesheetsWithin: number;
    stylesheetsRuleThreshold: number;
    adoptedStylesheetAssets: boolean;
  };
  inlineImages?: boolean;
  inlineStylesheet?: boolean;
  // 其他配置选项...
};
```

这种类型定义表明 `captureAssets` 是 `recordOptions` 对象的一个可选属性。它包含 `objectURLs` 和 `origins` 属性，其含义与上述相同。

## 内联图像

在 rrweb.record 中设置时，之前的 `inlineImages` 配置选项已被更改，因此图像现在使用静态资源系统录制，而不是被内联到快照中。之前的实现存在一个问题：快照在图像加载/处理后被异步修改，而此时快照可能已经被发出。当直接使用 rrwebSnapshot.snapshot 时，之前的内联行为仍会保留。

## 内联样式表

在 rrweb.record 中，`inlineStylesheet` 配置选项已更新为使用静态资源系统。当它为 `true`（默认值）时，从 CORS 角度可访问其规则的样式表会作为静态资源录制，而不是被内联。现在还有一个 `inlineStylesheet: 'all'` 选项，它等同于 `captureAssets.stylesheets: true`。当直接使用 rrwebSnapshot.snapshot 时，之前的内联行为仍会保留。

## 结论

通过在 rrweb 中配置 `captureAssets` 选项，您可以控制在录制过程中如何录制比如图像这样的静态资源。这允许您自定义在网页上录制的交互中包含哪些静态资源。
