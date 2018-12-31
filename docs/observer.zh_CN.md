# 增量快照

在完成一次全量快照之后，我们就需要基于当前视图状态观察所有可能对视图造成改动的事件，在 rrweb 中我们已经观察了以下事件（将不断增加）：

- DOM 变动
  - 节点创建、销毁
  - 节点属性变化
  - 文本变化
- 鼠标移动
- 鼠标交互
  - mouse up、mouse down
  - click、double click、context menu
  - focus、blur
  - touch start、touch move、touch end
- 页面或元素滚动
- 视窗大小改变
- 输入

## Mutation Observer

由于我们在回放时不会执行所有的 JavaScript 脚本，所以例如这样的场景我们需要完整记录才能够实现回放：

> 点击 button，出现 dropdown menu，选择第一项，dropdown menu 消失

回放时，在“点击 button”执行之后 dropdown menu 不会自动出现，因为已经没有 JavaScript 脚本为我们执行这件事，所以我们需要记录 dropdown menu 相关的 DOM 节点的创建以及后续的销毁，这也是录制中的最大难点。

好在现代浏览器已经给我们提供了非常强大的 API —— [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) 用来完成这一功能。

此处我们不具体讲解 MutationObserver 的基本使用方式，只专注于在 rrweb 中我们需要做哪些特殊处理。

首先要了解 MutationObserver 的触发方式为**批量异步**回调，具体来说就是会在一系列 DOM 变化发生之后将这些变化一次性回调，传出的是一个 mutation 记录数组。

这一机制在常规使用时不会有问题，因为从 mutation 记录中我们可以获取到变更节点的 JS 对象，可以做很多等值比较以及访问父子、兄弟节点等操作来保证我们可以精准回放一条 mutation 记录。

但是在 rrweb 中由于我们有序列化的过程，我们就需要更多精细的判断来应对各种场景。

### 新增节点

例如以下两种操作会生成相同的 DOM 结构，但是产生不同的 mutation 记录：

```
body
  n1
    n2
```

1. 创建节点 n1 并 append 在 body 中，再创建节点 n2 并 append 在 n1 中。
2. 创建节点 n1、n2，将 n2 append 在 n1 中，再将 n1 append 在 body 中。

第 1 种情况将产生两条 mutation 记录，分别为增加节点 n1 和增加节点 n2；第 2 种情况则只会产生一条 mutation 记录，即增加节点 n1。

**注意**，在第一种情况下虽然 n1 append 时还没有子节点，但是由于上述的批量异步回调机制，当我们处理 mutation 记录时获取到的 n1 是已经有子节点 n2 的状态。

受第二种情况的限制，我们在处理新增节点时必须遍历其所有子孙节点，才能保证所有新增节点都被记录，但是这一策略应用在第一种情况中就会导致 n2 被作为新增节点记录两次，回放时就会产生与原页面不一致的 DOM 结构。

因此，在处理一次回调中的多个 mutation 记录时我们需要“惰性”处理新增节点，即在遍历每条 mutation 记录遇到新增节点时先收集，再在全部 mutation 遍历完毕之后对收集的新增节点进行去重操作，保证不遗漏节点的同时每个节点只被记录一次。

在[序列化设计](./serialization.zh_CN.md)中已经介绍了我们需要维护一个 `id -> Node` 的映射，因此当出现新增节点时，我们需要将新节点序列化并加入映射中。但由于我们为了去重新增节点，选择在所有 mutation 记录遍历完毕之后才进行序列化，在以下示例中就会出现问题：

1. mutation 记录1，新增节点 n1。我们暂不处理，等待最终去重后序列化。
2. mutation 记录2，n1 新增属性 a1。我们试图将它记录成一次增量快照，但会发现无法从映射中找到 n1 对应的 id，因为此时它还未被序列化。

由此可见，由于我们对新增节点进行了延迟序列化的处理，所有 mutation 记录也都需要先收集，再新增节点去重并序列化之后再做处理。

### 移除节点

在处理移除节点时，我们需要做以下处理：

1. 移除的节点还未被序列化，则说明是在本次 callback 中新增的节点，无需记录，并且从新增节点池中将其移除。
2. 上步中在一次 callback 中被新增又移除的节点我们将其称为 dropped node，用于最终处理新增节点时判断节点的父节点是否已经 drop。

### 属性变化覆盖写

尽管 MutationObserver 是异步批量回调，但是我们仍然可以认为在一次回调中发生的 mutations 之间时间间隔极短，因此在记录 DOM 属性变化时我们可以通过覆盖写的方式优化增量快照的体积。

例如对一个 `<textarea>` 进行 resize 操作，会触发大量的 width 和 height 属性变化的 mutation 记录。虽然完整记录会让回放更加真实，但是也可能导致增量快照数量大大增加。进行取舍之后，我认为在同一次 mutation callback 中只记录同一个节点某一属性的最终值即可，也就是后续的 mutation 记录会覆盖写之前已有的 mutation 记录中的属性变化部分。

## 鼠标移动

通过记录鼠标移动位置，我们可以在回放时模拟鼠标移动轨迹。

尽量保证回放时鼠标移动流畅的同时也要尽量减少对应增量快照的数量，所以我们需要在监听 mousemove 的同时进行两层节流处理。第一层是每 20 ms 最多记录一次鼠标坐标，第二层是每 500 ms 最多发送一次鼠标坐标集合，第二层的主要目的是避免一次请求内容过多而做的分段。

### 时间逆推

我们在每个增量快照生成时会记录一个时间戳，用于在回放时按正确的时间差回放。但是由于节流处理的影响，鼠标移动对应增量快照的时间戳会比实际记录时间要更晚，因此我们需要记录一个用于校正的负时间差，在回放时将时间校准。

## 输入

我们需要观察 `<input>`, `<textarea>`, `<select>` 三种元素的输入，包含人为交互和程序设置两种途径的输入。

### 人为交互

对于人为交互的操作我们主要靠监听 input 和 change 两个事件观察，需要注意的是对不同事件但值相同的情况进行去重。此外 `<input type="radio" />` 也是一类特殊的控件，如果多个 radio 元素的组件 name 属性相同，那么当一个被选择时其他都会被反选，但是不会触发任何事件，因此我们需要单独处理。

### 程序设置

通过代码直接设置这些元素的属性也不会触发事件，我们可以通过劫持对应属性的 setter 来达到监听的目的，示例代码如下：

```typescript
function hookSetter<T>(
  target: T,
  key: string | number | symbol,
  d: PropertyDescriptor,
): hookResetter {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    set(value) {
      // put hooked setter into event loop to avoid of set latency
      setTimeout(() => {
        d.set!.call(this, value);
      }, 0);
      if (original && original.set) {
        original.set.call(this, value);
      }
    },
  });
  return () => hookSetter(target, key, original || {});
}
```

注意为了避免我们在 setter 中的逻辑阻塞被录制页面的正常交互，我们应该把逻辑放入 event loop 中异步执行。