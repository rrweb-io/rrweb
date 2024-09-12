# 优化存储容量

在一些场景下 rrweb 的录制数据量可能高于你的预期，这部分文档可以帮助你选择适用于你的存储优化策略。

优化策略分为以下几类：

- 通过屏蔽 DOM 元素，减少录制的内容
- 通过 sampling 配置抽样策略，减少录制的数据
- 通过去冗、压缩，减少数据存储体积

## 屏蔽 DOM 元素

一些特定 DOM 元素可能会产生大量的录制数据，而这些数据未必是回放时关注的，这种情况下可以选择将这些 DOM 元素进行屏蔽，不录制其内容。

常见的大数据量 DOM 元素包括：

- 长列表
- 复杂的 SVG
- 包含 JS 控制动画的元素
- canvas 动画

## 抽样策略

录制时通过 sampling 配置可以让特定数据以抽样的形式减少录制频率：

**示例 1**

```js
rrweb.record({
  emit(event) {},
  sampling: {
    // 不录制鼠标移动事件
    mousemove: false
    // 不录制鼠标交互事件
    mouseInteraction: false,
    // 设置滚动事件的触发频率
    scroll: 150 // 每 150ms 最多触发一次
    // set the interval of media interaction event
    media: 800
    // 设置输入事件的录制时机
    input: 'last' // 连续输入时，只录制最终值
  }
})
```

**示例 2**

```js
rrweb.record({
  emit(event) {},
  sampling: {
    // 定义不录制的鼠标交互事件类型，可以细粒度的开启或关闭对应交互录制
    mouseInteraction: {
      MouseUp: false,
      MouseDown: false,
      Click: false,
      ContextMenu: false,
      DblClick: false,
      Focus: false,
      Blur: false,
      TouchStart: false,
      TouchEnd: false,
    },
  },
});
```

## 压缩

### 基于 packFn 的单数据压缩

rrweb 提供了一个基于 fflate 的简单压缩函数，在 [@rrweb/packer](../../packages/packer/) 中可以作为 `packFn` 传入使用。

```js
import { pack } from '@rrweb/packer';

rrweb.record({
  emit(event) {},
  packFn: rrweb.pack,
});
```

回放时通用需要传入 packer.unpack 作为 `unpackFn` 传入。

```js
import { unpack } from '@rrweb/packer';

const replayer = new rrweb.Replayer(events, {
  unpackFn: rrweb.unpack,
});
```

### 批量压缩

基于 packFn 的单数据压缩以每个 event 数据为单位进行压缩，但这很多时候不能发挥 rrweb 录制数据易于压缩的优势。

因此**更加推荐**在服务端实现多个 event 的批量压缩，例如将单次用户操作产生的所有 event 数据进行一次压缩，对于 gzip 等压缩算法来说更为友好。

## 去冗

另一个优化存储容量的思路是去冗。

为了模拟 hover 等需求，rrweb 会尽可能的将 CSS 样式 inline 在录制数据中。

可以想象，如果使用 rrweb 录制每个用户对 github.com 的访问，则会在录制数据中保存大量重复的样式表内容。

可以通过遍历录制数据，将包含样式表的内容提取单独保存的方式，将这部分相同数据仅保存一份。

另一方面，全量快照类的数据也存在同样的问题，可以使用同样的思路去冗，减少存储总量。
