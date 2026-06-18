# rrweb 中的录制静态资源的方法和配置

[rrweb](https://rrweb.io/) 是一个 JavaScript 库，允许您录制并回放您网页上的用户操作。它为录制静态资源（如图像）提供了各种配置选项。在本文档中，我们将探讨 rrweb 中不同的录制静态资源的方法及其配置选项。

## 内联图像（已弃用）

`inlineImages` 配置选项已被弃用，不应再使用。它存在一些问题，即重写已经发出的事件，这可能使您错过已发送到服务器的内联图像。相反，请使用 `captureAssets` 选项来配置静态资源录制。

## 录制静态资源配置

`captureAssets` 配置选项允许您自定义录制静态资源的过程。它是一个具有以下属性的对象：

- `objectURLs`（默认值：`true`）：此属性指定是否使用 object URL 录制同源 `blob:` 资源。Object URL 是使用 `URL.createObjectURL()` 方法创建的。将 `objectURLs` 设置为 `true` 可以启用对象 URL 的录制。

- `origins`（默认值：`false`）：此属性确定录制哪些域名的资源。它可以有以下值：
  - `false` 或 `[]`：除了 Object URL 之外，不录制任何静态资源。
  - `true`：从所有来源获取资源。
  - `[origin1, origin2, ...]`：仅从指定的来源获取资源。例如，`origins: ['https://s3.example.com/']` 表示录制来自 `https://s3.example.com/` 的所有静态资源。

## TypeScript 类型定义

这是 `recordOptions` 对象的 TypeScript 类型定义，其中包括录制静态资源的配置选项：

```typescript
export type recordOptions<T> = {
  // 其他配置选项...
  captureAssets?: {
    objectURLs: boolean;
    origins: string[] | true | false;
  };
  inlineImages?: boolean; // 已弃用
  // 其他配置选项...
};
```

这种类型定义表明 captureAssets 是 recordOptions 对象的一个可选属性。它包含 objectURLs 和 origins 属性，其含义与上述相同。

## 结论

通过在 rrweb 中配置 captureAssets 选项，您可以控制在记录过程中如何录制比如图像这样的静态资源。这允许你自定义在网页上录制的交互中包含哪些静态资源。
