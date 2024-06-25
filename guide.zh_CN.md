# 使用指南

> 除通用的使用指南外，你可能还想通过[场景示例](./docs/recipes/index.zh_CN.md)了解特定场景下的使用方式，或是通过[设计文档](./docs)深入 rrweb 的技术细节。

## 安装

### 直接通过 `<script>` 引入

推荐通过 jsdelivr 的 CDN 安装：

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/style.css"
/>
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.umd.min.cjs"></script>
```

也可以在 URL 中指定具体的版本号，例如：

```html
<script src="https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.14/dist/rrweb.umd.min.cjs"></script>
```

#### 仅引入录制部分

rrweb 代码分为录制和回放两部分，大多数时候用户在被录制的应用中只需要引入录制部分代码。同样可以通过使用 @rrweb/record 包和 CDN 服务来实现：

```html
<script src="https://cdn.jsdelivr.net/npm/@rrweb/record@latest/dist/record.umd.min.cjs"></script>
```

#### 其他包

除了 `rrweb` 和 `@rrweb/record` 包之外，rrweb 还提供了其他不同用途的包。

- [rrweb](packages/rrweb)：rrweb 的核心包，包括录制和回放功能。
- [rrweb-player](packages/rrweb-player)：rrweb 的图形用户界面，提供时间线和暂停、快进、加速等按钮。
- [rrweb-snapshot](packages/rrweb-snapshot)：处理快照和重建功能，将 DOM 及其状态转换为可序列化的数据结构。
- [rrdom](packages/rrdom)：rrweb 的虚拟 dom 包。
- [rrdom-nodejs](packages/rrdom-nodejs)：用于服务器端 DOM 操作的 rrdom 的 Node.js 版本。
- [@rrweb/all](packages/all)：一个包含 `rrweb` 和 `@rrweb/packer`，便于安装的包。
- [@rrweb/record](packages/record)：一个用于录制 rrweb 会话的包。
- [@rrweb/replay](packages/replay)：一个用于回放 rrweb 会话的包。
- [@rrweb/packer](packages/packer)：一个用于打包和解包 rrweb 数据的包。
- [@rrweb/types](packages/types)：包含 rrweb 包中共享的类型定义。
- [@rrweb/utils](packages/utils)：包含 rrweb 包中共享的工具函数。
- [web-extension](packages/web-extension)：rrweb 的网页扩展。
- [rrvideo](packages/rrvideo)：一个用于处理 rrweb 中视频操作的包。
- [@rrweb/rrweb-plugin-console-record](packages/plugins/rrweb-plugin-console-record)：一个用于记录控制台日志的插件。
- [@rrweb/rrweb-plugin-console-replay](packages/plugins/rrweb-plugin-console-replay)：一个用于回放控制台日志的插件。
- [@rrweb/rrweb-plugin-sequential-id-record](packages/plugins/rrweb-plugin-sequential-id-record)：一个用于记录顺序 ID 的插件。
- [@rrweb/rrweb-plugin-sequential-id-replay](packages/plugins/rrweb-plugin-sequential-id-replay)：一个用于回放顺序 ID 的插件。
- [@rrweb/rrweb-plugin-canvas-webrtc-record](packages/plugins/rrweb-plugin-canvas-webrtc-record)：一个用于通过 WebRTC 流式传输 `<canvas>` 的插件。
- [@rrweb/rrweb-plugin-canvas-webrtc-replay](packages/plugins/rrweb-plugin-canvas-webrtc-replay)：一个用于通过 WebRTC 播放流式 `<canvas>` 的插件。

### 通过 npm 引入

```shell
npm install --save rrweb
```

rrweb 同时提供 commonJS 和 ES modules 两种格式的打包文件，易于和常见的打包工具配合使用。

### 兼容性

由于使用 `MutationObserver` API，rrweb 不支持 IE11 以下的浏览器。可以从[这里](https://caniuse.com/#feat=mutationobserver)找到兼容的浏览器列表。

## 快速开始

### 录制

如果通过 `<script>` 的方式仅引入录制部分，那么可以访问到全局变量 `rrwebRecord`，它和全量引入时的 `rrweb.record` 使用方式完全一致，以下示例代码将使用后者。

```js
rrweb.record({
  emit(event) {
    // 用任意方式存储 event
  },
});
```

rrweb 在录制时会不断将各类 event 传递给配置的 emit 方法，你可以使用任何方式存储这些 event 以便之后回放。

调用 `record` 方法将返回一个函数，调用该函数可以终止录制：

```js
let stopFn = rrweb.record({
  emit(event) {
    if (events.length > 100) {
      // 当事件数量大于 100 时停止录制
      stopFn();
    }
  },
});
```

一个更接近实际真实使用场景的示例如下：

```js
let events = [];

rrweb.record({
  emit(event) {
    // 将 event 存入 events 数组中
    events.push(event);
  },
});

// save 函数用于将 events 发送至后端存入，并重置 events 数组
function save() {
  const body = JSON.stringify({ events });
  events = [];
  fetch('http://YOUR_BACKEND_API', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
}

// 每 10 秒调用一次 save 方法，避免请求过多
setInterval(save, 10 * 1000);
```

#### 配置参数

`rrweb.record(config)` 的 config 部分接受以下参数

| key                      | 默认值             | 功能                                                                                                                                                                                  |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| emit                     | 必填               | 获取当前录制的数据                                                                                                                                                                    |
| checkoutEveryNth         | -                  | 每 N 次事件重新制作一次全量快照<br />详见[“重新制作快照”](#重新制作快照)章节                                                                                                          |
| checkoutEveryNms         | -                  | 每 N 毫秒重新制作一次全量快照<br />详见[“重新制作快照”](#重新制作快照)章节                                                                                                            |
| blockClass               | 'rr-block'         | 字符串或正则表达式，可用于自定义屏蔽元素的类名，详见[“隐私”](#隐私)章节                                                                                                               |
| blockSelector            | null               | 所有 element.matches(blockSelector)为 true 的元素都不会被录制，回放时取而代之的是一个同等宽高的占位元素                                                                               |
| ignoreClass              | 'rr-ignore'        | 字符串或正则表达式，可用于自定义忽略元素的类名，详见[“隐私”](#隐私)章节                                                                                                               |
| ignoreCSSAttributes      | null               | 应该被忽略的 CSS 属性数组                                                                                                                                                             |
| maskTextClass            | 'rr-mask'          | 字符串或正则表达式，可用于自定义忽略元素 text 内容的类名，详见[“隐私”](#隐私)章节                                                                                                     |
| maskTextSelector         | null               | 所有 element.matches(maskTextSelector)为 true 的元素及其子元素的 text 内容将会被屏蔽                                                                                                  |
| maskAllInputs            | false              | 将所有输入内容记录为 \*                                                                                                                                                               |
| maskInputOptions         | { password: true } | 选择将特定类型的输入框内容记录为 \*<br />类型详见[列表](https://github.com/rrweb-io/rrweb/blob/588164aa12f1d94576f89ae0210b98f6e971c895/packages/rrweb-snapshot/src/types.ts#L77-L95) |
| maskInputFn              | -                  | 自定义特定类型的输入框内容记录逻辑                                                                                                                                                    |
| maskTextFn               | -                  | 自定义文字内容的记录逻辑                                                                                                                                                              |
| slimDOMOptions           | {}                 | 去除 DOM 中不必要的部分 <br />类型详见[列表](https://github.com/rrweb-io/rrweb/blob/588164aa12f1d94576f89ae0210b98f6e971c895/packages/rrweb-snapshot/src/types.ts#L97-L108)           |
| inlineStylesheet         | true               | 是否将样式表内联                                                                                                                                                                      |
| hooks                    | {}                 | 各类事件的回调<br />类型详见[列表](https://github.com/rrweb-io/rrweb/blob/9488deb6d54a5f04350c063d942da5e96ab74075/src/types.ts#L207)                                                 |
| packFn                   | -                  | 数据压缩函数，详见[优化存储策略](./docs/recipes/optimize-storage.zh_CN.md)                                                                                                            |
| sampling                 | -                  | 数据抽样策略，详见[优化存储策略](./docs/recipes/optimize-storage.zh_CN.md)                                                                                                            |
| dataURLOptions           | {}                 | Canvas 图像快照的格式和质量,这个参数将传递给 OffscreenCanvas.convertToBlob()，使用这个参数能有效减小录制数据的大小                                                                    |
| recordCanvas             | false              | 是否记录 canvas 内容, 可用选项：`false`, `true`                                                                                                                                       |
| recordCrossOriginIframes | false              | 是否记录 cross origin iframes。 必须在每个子 iframe 中注入 rrweb 才能使其工作。 可用选项：`false`, `true`                                                                             |
| recordAfter              | 'load'             | 如果 document 还没有加载完成，recorder 将会在指定的事件触发后开始录制。可用选项： `DOMContentLoaded`, `load`                                                                          |
| inlineImages             | false              | 是否将图片内容记内联录制                                                                                                                                                              |
| collectFonts             | false              | 是否记录页面中的字体文件                                                                                                                                                              |
| userTriggeredOnInput     | false              | [什么是 `userTriggered`](https://github.com/rrweb-io/rrweb/pull/495)                                                                                                                  |
| plugins                  | []                 | 加载插件以获得额外的录制功能. [什么是插件？](./docs/recipes/plugin.zh_CN.md)                                                                                                          |
| errorHandler             | -                  | 一个可以定制化处理错误的回调函数，它的参数是错误对象。如果 rrweb recorder 内部的某些内容抛出错误，则会调用该回调。                                                                    |

#### 隐私

页面中可能存在一些隐私相关的内容不希望被录制，rrweb 为此做了以下支持：

- 在 HTML 元素中添加类名 `.rr-block` 将会避免该元素及其子元素被录制，回放时取而代之的是一个同等宽高的占位元素。
- 在 HTML 元素中添加类名 `.rr-ignore` 将会避免录制该元素的输入事件。
- 所有带有`.rr-mask`类名的元素及其子元素的 text 内容将会被屏蔽。
- `input[type="password"]` 类型的密码输入框默认不会录制输入事件。
- 配置中还有更为丰富的隐私保护选项。

#### 重新制作快照

默认情况下，要重放内容需要所有的 event，如果你不想存储所有的 event，可以使用`checkout`配置。

**多数时候你不必这样配置**。但比如在页面错误发生时，你只想捕获最近的几次 event ，这里有一个例子：

```js
// 使用二维数组来存放多个 event 数组
const eventsMatrix = [[]];

rrweb.record({
  emit(event, isCheckout) {
    // isCheckout 是一个标识，告诉你重新制作了快照
    if (isCheckout) {
      eventsMatrix.push([]);
    }
    const lastEvents = eventsMatrix[eventsMatrix.length - 1];
    lastEvents.push(event);
  },
  checkoutEveryNth: 200, // 每 200 个 event 重新制作快照
});

// 向后端传送最新的两个 event 数组
window.onerror = function () {
  const len = eventsMatrix.length;
  const events = eventsMatrix[len - 2].concat(eventsMatrix[len - 1]);
  const body = JSON.stringify({ events });
  fetch('http://YOUR_BACKEND_API', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
};
```

由于 rrweb 使用了增量快照机制，我们不能指定数量来捕获最近的几次 event。上面这个例子，你可以拿到最新的 200-400 个 event 来发送给你的后端。

类似的，你可以通过配置 `checkoutEveryNms` 来捕获最近指定时间的 event :

```js
// 使用二维数组来存放多个 event 数组
const eventsMatrix = [[]];

rrweb.record({
  emit(event, isCheckout) {
    // isCheckout 是一个标识，告诉你重新制作了快照
    if (isCheckout) {
      eventsMatrix.push([]);
    }
    const lastEvents = eventsMatrix[eventsMatrix.length - 1];
    lastEvents.push(event);
  },
  checkoutEveryNms: 5 * 60 * 1000, // 每5分钟重新制作快照
});

// 向后端传送最新的两个 event 数组
window.onerror = function () {
  const len = eventsMatrix.length;
  const events = eventsMatrix[len - 2].concat(eventsMatrix[len - 1]);
  const body = JSON.stringify({ events });
  fetch('http://YOUR_BACKEND_API', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
};
```

在上面的例子中，你最终会拿到最新的 5-10 分钟的 event 来发送给你的后端。

### 回放

回放时需要引入对应的 CSS 文件：

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/style.css"
/>
```

再通过以下 JS 代码初始化 replayer：

```js
const events = YOUR_EVENTS;

const replayer = new rrweb.Replayer(events);
replayer.play();
```

#### 使用 API 控制回放

```js
const replayer = new rrweb.Replayer(events);

// 播放
replayer.play();

// 从第 3 秒的内容开始播放
replayer.play(3000);

// 暂停
replayer.pause();

// 暂停至第 5 秒处
replayer.pause(5000);

// 销毁播放器 (提示： 这个操作不可逆)
replayer.destroy();
```

#### 配置参数

可以通过 `new rrweb.Replayer(events, options)` 的方式向 rrweb 传递回放时的配置参数，具体配置如下：

| key                 | 默认值        | 功能                                                                                                                                                                                                 |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| speed               | 1             | 回放倍速                                                                                                                                                                                             |
| root                | document.body | 回放时使用的 HTML 元素                                                                                                                                                                               |
| loadTimeout         | 0             | 加载异步样式表的超时时长                                                                                                                                                                             |
| skipInactive        | false         | 是否快速跳过无用户操作的阶段                                                                                                                                                                         |
| showWarning         | true          | 是否在回放过程中打印警告信息                                                                                                                                                                         |
| showDebug           | false         | 是否在回放过程中打印 debug 信息                                                                                                                                                                      |
| blockClass          | 'rr-block'    | 需要在回放时展示为隐藏区域的元素类名                                                                                                                                                                 |
| liveMode            | false         | 是否开启直播模式                                                                                                                                                                                     |
| insertStyleRules    | []            | 可以传入多个 CSS rule string，用于自定义回放时 iframe 内的样式                                                                                                                                       |
| triggerFocus        | true          | 回放时是否回放 focus 交互                                                                                                                                                                            |
| UNSAFE_replayCanvas | false         | 回放时是否回放 canvas 内容，**开启后将会关闭沙盒策略，导致一定风险**                                                                                                                                 |
| pauseAnimation      | true          | 当播放器停止播放时，是否将 CSS 动画也停止播放                                                                                                                                                        |
| mouseTail           | true          | 是否在回放时增加鼠标轨迹。传入 false 可关闭，传入对象可以定制轨迹持续时间、样式等，配置详见[类型](https://github.com/rrweb-io/rrweb/blob/9488deb6d54a5f04350c063d942da5e96ab74075/src/types.ts#L407) |
| unpackFn            | -             | 数据解压缩函数，详见[优化存储策略](./docs/recipes/optimize-storage.zh_CN.md)                                                                                                                         |
| plugins             | []            | 加载插件以获得额外的回放功能. [什么是插件？](./docs/recipes/plugin.zh_CN.md)                                                                                                                         |
| useVirtualDom       | true          | 在播放器跳转到一个新的时间点的过程中，是否使用 Virtual Dom 优化                                                                                                                                      |
| logger              | console       | 当播放器出现警告或错误时用来打印日志的对象                                                                                                                                                           |

#### 使用 rrweb-player

rrweb 自带的回放只提供所有的 JS API 以及最基本的 UI，如果需要功能更强的回放播放器 UI，可以使用 rrweb-player。

##### 安装

rrweb-player 同样可以使用 CDN 方式安装：

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/style.css"
/>
<script src="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/index.js"></script>
```

或者通过 npm 安装：

```shell
npm install --save rrweb-player
```

```js
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
```

##### 使用

通过 props 传入 events 数据及配置项

```js
new rrwebPlayer({
  target: document.body, // 可以自定义 DOM 元素
  // 配置项
  props: {
    events,
  },
});
```

##### 配置项参数

| key            | 默认值       | 功能                                                  |
| -------------- | ------------ | ----------------------------------------------------- |
| events         | []           | 包含回放所需的数据                                    |
| width          | 1024         | 播放器宽度                                            |
| height         | 576          | 播放器高度                                            |
| autoPlay       | true         | 是否自动播放                                          |
| speedOption    | [1, 2, 4, 8] | 倍速播放可选值                                        |
| showController | true         | 是否显示播放器控制 UI                                 |
| tags           | {}           | 可以以 key value 的形式展示自定义事件在时间轴上的颜色 |
| ...            | -            | 其它所有 rrweb Replayer 的配置参数均可透传            |

#### 事件

开发者可能希望监听回放时的各类事件，例如在跳过无用户操作的时间时给用户一些提示。

rrweb 的 Replayer 提供了 `on` API 用于提供该功能

```js
const replayer = new rrweb.Replayer(events);
replayer.on(EVENT_NAME, (payload) => {
  ...
})
```

其包含的事件如下：

| 事件类型               | 描述                   | 值                |
| ---------------------- | ---------------------- | ----------------- |
| start                  | 回放开始               | -                 |
| pause                  | 回放暂停               | -                 |
| finish                 | 回放完成               | -                 |
| resize                 | 回放视图大小发生变化   | { width, height } |
| fullsnapshot-rebuilded | 全量快照完成重建       | event             |
| load-stylesheet-start  | 开始加载远端样式表     | -                 |
| load-stylesheet-end    | 加载远端样式表完成     | -                 |
| skip-start             | 开始跳过无用户操作时间 | { speed }         |
| skip-end               | 结束无用户操作时间     | { speed }         |
| mouse-interaction      | 回放鼠标交互事件       | { type, target }  |
| event-cast             | 回放 event             | event             |
| custom-event           | 回放自定义事件         | event             |
| destroy                | 销毁播放器             | -                 |

使用 `rrweb-player` 时，也可以通过 `addEventListener` API 使用相同的事件功能，并且会获得 3 个额外的事件：

| 事件类型               | 描述           | 值          |
| ---------------------- | -------------- | ----------- |
| ui-update-current-time | 当前回放时间点 | { payload } |
| ui-update-player-state | 当前回放状态   | { payload } |
| ui-update-progress     | 当前回放百分比 | { payload } |

## REPL 工具

在不安装 rrweb 的情况下，也可以通过使用 REPL 工具试用 rrweb 录制 web 应用。

运行 `yarn repl`，将会启动浏览器并在命令行要求输入一个测试的 url：

```
Enter the url you want to record, e.g https://react-redux.realworld.io:
```

输入后等待浏览器打开指定页面，并在命令行中出现以下提示信息：

```
Enter the url you want to record, e.g https://react-redux.realworld.io: https://github.com
Going to open https://github.com...
Ready to record. You can do any interaction on the page.
Once you want to finish the recording, enter 'y' to start replay:
```

此时可以在页面中进行交互，待所需录制操作完成后，在命令行输入 y，测试工具就会将刚刚的操作进行回放，用于验证录制是否成功。

回放时命令行中将出现以下提示信息：

```
Enter 'y' to persistently store these recorded events:
```

此时可以再次在命令行中输入 y，测试工具将把已录制的内容存入一个静态 HTML 文件中，并提示存放位置：

```
Saved at PATH_TO_YOUR_REPO/temp/replay_2018_11_23T07_53_30.html
```

该文件默认使用最新 bundle 的 rrweb 代码，所以我们可以在修改代码后运行 `npm run bundle:browser`，之后刷新静态文件就可以查看最新代码对回放的影响并进行调试。
