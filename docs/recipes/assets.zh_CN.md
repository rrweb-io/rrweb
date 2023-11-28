# rrweb 中的资源捕获方法和配置

[rrweb](https://rrweb.io/) 是一个 JavaScript 库，允许您记录并重放您网站上的用户互动。它为捕获资产（如图像）提供了各种配置选项。在本文档中，我们将探讨 rrweb 中不同的资源捕获方法及其配置选项。

## 内联图像（已弃用）

`inlineImages` 配置选项已被弃用，不应再使用。它存在一些问题，即重写已经发出的事件，这可能使您错过已发送到服务器的内联图像。相反，请使用 `assetCapture` 选项来配置资源捕获。

## 资源捕获配置

`assetCapture` 配置选项允许您自定义资源捕获过程。它是一个具有以下属性的对象：

- `objectURLs`（默认值：`true`）：此属性指定是否使用对象 URL 捕获同源 `blob:` 资源。对象 URL 是使用 `URL.createObjectURL()` 方法创建的。将 `objectURLs` 设置为 `true` 可以启用对象 URL 的捕获。

- `origins`（默认值：`false`）：此属性确定从哪些来源捕获资源。它可以有以下值：
  - `false` 或 `[]`：除了对象 URL 之外，不捕获任何资源。
  - `true`：从所有来源捕获资源。
  - `[origin1, origin2, ...]`：仅从指定的来源捕获资源。例如，`origins: ['https://s3.example.com/']` 从 `https://s3.example.com/` 来源捕获所有资源。

## TypeScript 类型定义

这是 `recordOptions` 对象的 TypeScript 类型定义，其中包括资源捕获配置选项：

```typescript
export type recordOptions<T> = {
  // 其他配置选项...
  assetCapture?: {
    objectURLs: boolean;
    origins: string[] | true | false;
  };
  inlineImages?: boolean; // 已弃用
  // 其他配置选项...
};
```

这种类型定义表明 assetCapture 是 recordOptions 对象的一个可选属性。它包含 objectURLs 和 origins 属性，其含义与上述相同。

## 结论

通过在 rrweb 中配置 assetCapture 选项，您可以控制在记录过程中如何捕获像图像这样的资源。这允许您
