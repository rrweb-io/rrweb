# 使用指南

## 安装

### 直接通过 `<script>` 引入

推荐通过 jsdelivr 的 CDN 安装：

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.css"
/>
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>
```

也可以在 URL 中指定具体的版本号，例如：

```html
<script src="https://cdn.jsdelivr.net/npm/rrweb@0.7.0/dist/rrweb.min.js"></script>
```

#### 仅引入录制部分

rrweb 代码分为录制和回放两部分，大多数时候用户在被录制的应用中只需要引入录制部分代码，同样可以通过 CDN 安装：

```html
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/record/rrweb-record.min.js"></script>
```

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

rweb 在录制时会不断将各类 event 传递给配置的 emit 方法，你可以使用任何方式存储这些 event 以便之后回放。

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

#### 隐私

页面中可能存在一些隐私相关的内容不希望被录制，rrweb 为此做了以下支持：

- 在 HTML 元素中添加类名 `.rr-block` 将会避免该元素及其子元素被录制，回放时取而代之的是一个同等宽高的占位元素。
- 在 HTML 元素中添加类名 `.rr-ignore` 将会避免录制该元素的输入事件。
- `input[type="password"]` 类型的密码输入框默认不会录制输入事件。

### 回放

回放时需要引入对应的 CSS 文件：

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.css"
/>
```

再通过以下 JS 代码初始化 replayer：

```js
const events = YOUR_EVENTS;

const replayer = new rrweb.Replayer(events);
replayer.play();
```

#### 配置参数

可以通过 `new rrweb.Replayer(events, options)` 的方式向 rrweb 传递回放时的配置参数，具体配置如下：

| key          | 默认值        | 功能                            |
| ------------ | ------------- | ------------------------------- |
| speed        | 1             | 回放倍速                        |
| root         | document.body | 回放时使用的 HTML 元素          |
| loadTimeout  | 0             | 加载异步样式表的超时时长        |
| skipInactive | false         | 是否快速跳过无用户操作的阶段    |
| showWarning  | true          | 是否在回放过程中打印警告信息    |
| showDebug    | false         | 是否在回放过程中打印 debug 信息 |

#### 使用 rrweb-player

rrweb 自带的回放只提供所有的 JS API 以及最基本的 UI，如果需要更强的回放播放器 UI，可以使用 rrweb-player。

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

##### 使用

```js
new rrwebPlayer({
  target: document.body, // 可以自定义 DOM 元素
  data: {
    events,
  },
});
```

## API

### rrweb

#### rrweb.record

```typescript
type record = (options: recordOptions) => listenerHandler;

type recordOptions = {
  emit: (e: eventWithTime) => void;
};
type listenerHandler = () => void;
```

#### rrweb.Replayer

```typescript
class Replayer {
  public wrapper: HTMLDivElement;

  constructor(events: eventWithTime[], config?: Partial<playerConfig>);

  public on(event: string, handler: mitt.Handler): void;
  public setConfig(config: Partial<playerConfig>): void;
  public getMetaData(): playerMetaData;
  public getTimeOffset(): number;
  public play(timeOffset?: number): void;
  public pause(): void;
  public resume(timeOffset?: number): void;
}

type playerConfig = {
  speed: number;
  root: Element;
  loadTimeout: number;
  skipInactive: Boolean;
};

type playerMetaData = {
  totalTime: number;
};
```

## REPL 工具

在不安装 rrweb 的情况下，也可以通过使用 REPL 工具试用 rrweb 录制 web 应用。

运行 `npm run repl`，将会启动浏览器并在命令行要求输入一个测试的 url：

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
