# 跨域 IFrame 录制

浏览器会阻止父页面访问跨域 iframe 的内容。要录制这些内容，需要在父页面和子页面中运行 rrweb，并启用 `recordCrossOriginIframes`。iframe 会将录制事件发送给父窗口。

> **安全警告：** 除非您[严格限制哪些网站可以嵌入您的页面](https://stackoverflow.com/a/21629575)，并信任这些网站接收页面的录制内容，否则不建议启用跨域 iframe 录制。
> 浏览器的跨域限制用于保护敏感信息。使用默认的 `crossOriginIframeParentOrigin: '*'` 时，恶意网站可以嵌入您的页面并收集其录制内容。

在子页面中设置 `crossOriginIframeParentOrigin`，可以限制只有受信任的父窗口来源才能接收事件。此选项控制事件的接收方，不会限制哪些网站可以嵌入您的页面。

## 如何记录跨源 iframe

在父页面中启用录制跨域 iframe:

```js
import { record } from '@rrweb/record';

record({
  emit(event) {}, // 所有事件都将在此处发出，包括来自跨源 iframe 的事件
  recordCrossOriginIframes: true,
});
```

在子页面中启用录制。此示例中，父页面位于 `https://app.example.com`:

```js
import { record } from '@rrweb/record';

record({
  recordCrossOriginIframes: true,
  crossOriginIframeParentOrigin: 'https://app.example.com',
});
```

子页面会将事件转发给父窗口，不会调用自己的 `emit` 回调，因此不需要提供 `emit` 回调。

## 限制接收事件的父窗口来源

`crossOriginIframeParentOrigin` 是字符串，默认值为 `'*'`。在每个跨域子页面的录制配置中，将其设置为直接父窗口的来源。
来源包含协议、主机名和必要的端口，例如 `https://app.example.com:8443`。不要包含路径或末尾斜杠。

只有父窗口来源匹配时，浏览器才会传递事件。如果不匹配，父窗口将无法收到该 iframe 的录制事件。在顶层页面中设置此选项不会配置子页面的录制器。
此选项仅在 `recordCrossOriginIframes` 为 `true` 且录制器从跨域 iframe 转发事件时生效。

对于嵌套的跨域 iframe，应为每个子页面配置其直接父窗口的来源，该来源可能与顶层页面不同。

## 注意事项

当跨源 iframe 录制开启时，rrweb 将检查它是否正在顶级窗口中运行。 如果不是，它将通过 `postMessage` 将事件发送到父窗口。

如果您没有在顶层窗口中运行 rrweb，则打开 `recordCrossOriginIframes` 时事件将丢失。

使用默认的 `crossOriginIframeParentOrigin: '*'` 时，任何父网站都能接收事件并将其发送到自己的服务器。

限制父窗口来源只控制浏览器向哪个来源传递事件，不会阻止受信任父页面中的脚本读取事件。只应允许您信任的父窗口来源接收 iframe 的录制内容。

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

      window.rrweb.record({
        emit: (event) => {
          window._captureEvent(event);
        },
        recordCrossOriginIframes: true,
      });
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
