# 序列化

如果仅仅需要在本地录制和回放浏览器内的变化，那么我们可以简单地通过深拷贝 DOM 来实现当前视图的保存。例如通过以下的代码实现（使用 jQuery 简化示例，仅保存 body 部分）：

```javascript
// record
const snapshot = $('body').clone();
// replay
$('body').replaceWith(snapshot);
```

我们通过将 DOM 对象整体保存在内存中实现了快照。

但是这个对象本身并不是**可序列化**的，因此我们不能将其保存为特定的文本格式（例如 JSON）进行传输，也就无法做到远程录制，所以我们首先需要实现将 DOM 及其视图状态序列化的方法。在这里我们不使用一些开源方案例如 [parse5](https://github.com/inikulin/parse5) 的原因包含两个方面：

1. 我们需要实现一个“非标准”的序列化方法，下文会详细展开。
2. 此部分代码需要运行在被录制的页面中，要尽可能的控制代码量，只保留必要功能。

## 序列化中的特殊处理

之所以说我们的序列化方法是非标准的是因为我们还需要做以下几部分的处理：

1. 去脚本化。被录制页面中的所有 JavaScript 都不应该被执行，例如我们会在重建快照时将 `script` 标签改为 `noscript` 标签，此时 script 内部的内容就不再重要，录制时可以简单记录一个标记值而不需要将可能存在的大量脚本内容全部记录。
2. 记录没有反映在 HTML 中的视图状态。例如 `<input type="text" />` 输入后的值不会反映在其 HTML 中，而是通过 `value` 属性记录，我们在序列化时就需要读出该值并且以属性的形式回放成 `<input type="text" value="recordValue" />`。
3. 相对路径转换为绝对路径。回放时我们会将被录制的页面放置在一个 `<iframe>` 中，此时的页面 URL为重放页面的地址，如果被录制页面中有一些相对路径就会产生错误，所以在录制时就要将相对路径进行转换，同样的 CSS 样式表中的相对路径也需要转换。
4. 尽量记录 CSS 样式表的内容。如果被录制页面加载了一些同源的 样式表，我们则可以获取到解析好的 CSS rules，录制时将能获取到的样式都 inline 化，这样可以让一些内网环境（如 localhost）的录制也有比较好的效果。

## 唯一标识

同时，我们的序列化还应该包含全量和增量两种类型，全量序列化可以将一个 DOM 树转化为对应的树状数据结构。

例如以下的 DOM 树：

```html
<html>
  <body>
    <header>
    </header>
  </body>
</html>
```

会被序列化成类似这样的数据结构：

```json
{
  "type": "Document",
  "childNodes": [
    {
      "type": "Element",
      "tagName": "html",
      "attributes": {},
      "childNodes": [
        {
          "type": "Element",
          "tagName": "head",
          "attributes": {},
          "childNodes": [],
          "id": 3
        },
        {
          "type": "Element",
          "tagName": "body",
          "attributes": {},
          "childNodes": [
            {
              "type": "Text",
              "textContent": "\n    ",
              "id": 5
            },
            {
              "type": "Element",
              "tagName": "header",
              "attributes": {},
              "childNodes": [
                {
                  "type": "Text",
                  "textContent": "\n    ",
                  "id": 7
                }
              ],
              "id": 6
            }
          ],
          "id": 4
        }
      ],
      "id": 2
    }
  ],
  "id": 1
}
```

这个序列化的结果中有两点需要注意：

1. 我们遍历 DOM 树时是以 Node 为单位，因此除了场景的元素类型节点以为，还包括 Text Node、Comment Node 等所有 Node 的记录。
2. 我们给每一个 Node 都添加了唯一标识 `id`，这是为之后的增量快照做准备。

想象一下如果我们在同页面中记录一次点击按钮的操作并回放，我们可以用以下格式记录该操作（也就是我们所说的一次增量快照）：

```javascript
type clickSnapshot = {
  source: 'MouseInteraction';
  type: 'Click';
  node: HTMLButtonElement;
}
```

再通过 `snapshot.node.click()` 就能将操作再执行一次。

但是在实际场景中，虽然我们已经重建出了完整的 DOM，但是却没有办法将增量快照中被交互的 DOM 节点和已存在的 DOM 关联在一起。

这就是唯一标识 `id` 的作用，我们在录制端和回放端维护随时间变化完全一致的 `id -> Node` 映射，并随着 DOM 节点的创建和销毁进行同样的更新，保证我们在增量快照中只需要记录 `id` 就可以在回放时找到对应的 DOM 节点。

上述示例中的数据结构相应的变为：

```typescript
type clickSnapshot = {
  source: 'MouseInteraction';
  type: 'Click';
  id: Number;
}
```

