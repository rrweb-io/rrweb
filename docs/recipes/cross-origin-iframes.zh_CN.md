# 跨域 IFrame 录制

浏览器会阻止父页面访问跨域 iframe 的内容。要录制这些内容，需要在父页面和子页面中都运行 rrweb：子页面录制器通过 `postMessage` 将事件转发给父页面录制器，父页面将它们拼接成一份完整的录制。

分别在两侧设置两个选项来控制此行为：

- `collectFromOrigins` — 在**父页面**录制器中设置。一个子来源列表，父页面只接收并信任来自这些来源的事件，其他来源的事件会被丢弃。
- `emitToOrigin` — 在**跨域子页面**录制器中设置。其父窗口的来源，使浏览器只会将其事件投递给该父窗口。

> **安全警告：** 除非您[严格限制哪些网站可以嵌入您的页面](https://stackoverflow.com/a/21629575)，并信任这些网站接收页面的录制内容，否则不建议启用跨域 iframe 录制。
> 浏览器的跨域限制用于保护敏感信息。使用 `collectFromOrigins: ['*']` 接收事件，或使用 `emitToOrigin: '*'` 转发事件，都会移除这层保护——恶意页面便可以嵌入您的页面并收集其录制内容，或向您的录制中注入伪造的事件。请在两侧都指定具体的来源。

## 如何记录跨源 iframe

此示例中，父页面位于 `https://app.example.com`，子 iframe 位于 `https://widgets.example.com`。

在父页面中启用接收子页面的事件:

```js
import { record } from '@rrweb/record';

record({
  emit(event) {}, // 所有事件都将在此处发出，包括来自跨源 iframe 的事件
  collectFromOrigins: ['https://widgets.example.com'],
});
```

在子页面中启用向父页面转发事件:

```js
import { record } from '@rrweb/record';

record({
  emitToOrigin: 'https://app.example.com',
});
```

子页面会将事件转发给父窗口，不会调用自己的 `emit` 回调，因此不需要提供 `emit` 回调。

## `collectFromOrigins`（父页面侧）

`collectFromOrigins` 是一个来源列表。父页面录制器只接收来自这些来源的子 iframe 的事件；来自其他嵌入 iframe（广告框、不受信任的组件）的事件会在进入录制前被丢弃。设置它也是让父页面成为收集方的开关——不设置时父页面会忽略转发来的事件。

每一项都是完整来源：协议、主机名以及非默认端口，例如 `https://widgets.example.com:8443`。不要包含路径或末尾斜杠。使用 `['*']` 可接收任意来源，但这会重新引入上述注入风险。

## `emitToOrigin`（子页面侧）

`emitToOrigin` 是子页面**直接**父窗口的来源。只有父窗口来源匹配时浏览器才会投递转发的事件；如果不匹配，父窗口将收不到该 iframe 的任何事件。设置它也是让子页面从本地发出事件切换为向上转发的开关。

来源格式同上。在顶层录制器中设置此选项不会生效——它只对位于跨域 iframe 中的录制器有效。

## 嵌套的跨域 iframe

事件逐级向上传递：每个子页面转发给它的直接父窗口，父窗口重新发出事件，并且（如果它本身也是跨域子页面）再次向上转发。请用直接相邻的来源来配置每个页面，而不是顶层页面。

对于 `A (https://top.example) › B (https://mid.example) › C (https://deep.example)`:

```js
// A — 顶层收集方
record({ emit(event) {}, collectFromOrigins: ['https://mid.example'] });

// B — 中间层：从 C 收集并转发给 A
record({
  collectFromOrigins: ['https://deep.example'],
  emitToOrigin: 'https://top.example',
});

// C — 最内层：转发给 B
record({ emitToOrigin: 'https://mid.example' });
```

## 注意事项

跨域子页面录制器通过 `postMessage` 将其事件发送到父窗口。如果您没有在父窗口中运行 rrweb，这些事件将丢失。

`collectFromOrigins` 控制父页面接收来自哪些来源的事件，`emitToOrigin` 控制浏览器将事件投递给哪个父窗口。两者都不能阻止受信任父页面中的脚本在事件投递后读取它们。只应指定您信任的、可接收 iframe 录制内容的来源。

## 从 `recordCrossOriginIframes` 迁移

`recordCrossOriginIframes` 已废弃。它会同时启用两侧并信任任意来源。请改用按来源限定的选项：

- 在父页面：`recordCrossOriginIframes: true` → `collectFromOrigins: ['*']`，然后将 `['*']` 收窄为您真实的子来源。
- 在跨域子页面：`recordCrossOriginIframes: true` → `emitToOrigin: '<父窗口来源>'`。

## 将 rrweb 注入跨源 iframe 的选项

### 1. 网站所有者，在 iframe 中添加 rrweb

如果您拥有使用 iframe 的网站和嵌入在 iframe 中的网站，您可以通过脚本标签将 rrweb 添加到这两个页面。

### 2. 浏览器扩展

请查看 https://developer.chrome.com/docs/extensions/mv3/content_scripts/#functionality

### 3. Puppeteer script

```js
import puppeteer from 'puppeteer';

async function injectRecording(frame) {
  await frame.evaluate((rrwebCode) => {
    if (window.__IS_RECORDING__) return;
    window.__IS_RECORDING__ = true;

    (async () => {
      function loadScript(code) {
        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.innerHTML = code;
        if (document.head) {
          document.head.append(s);
        } else {
          requestAnimationFrame(() => {
            document.head.append(s);
          });
        }
      }
      loadScript(rrwebCode);

      if (window.parent === window) {
        window.rrweb.record({
          emit: (event) => {
            window._captureEvent(event);
          },
          collectFromOrigins: ['*'],
        });
      } else {
        window.rrweb.record({
          emitToOrigin: '*',
        });
      }
    })();
  }, code);
}

const browser = await puppeteer.launch();
const page = (await browser.pages())[0];

const events = []; // 包含来自所有Frame的所有事件

await page.exposeFunction('_captureEvent', (event) => {
  events.push(event);
});

page.on('framenavigated', async (frame) => {
  await injectRecording(frame); // 将 rrweb 注入 iframe
});

await page.goto('https://example.com');

// 您的事件将在事件数组中
```

### 4. Electron

```ts
const win = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    preload: path.join(__dirname, 'rrweb-recording-script.js'),
    // 这会打开 iframe 内的预加载，但会禁用节点集成
    nodeIntegrationInSubFrames: true,
    nodeIntegration: false,
  },
});
```

请查看 https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
和 https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
