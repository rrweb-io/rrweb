# Cross origin iframes

默认情况下，浏览器很难访问托管在不同域上的 iframe 的内容。 这是一项安全功能，可防止恶意站点访问其他站点上的敏感信息。 可以解决此安全功能。
但不建议这样做，除非您非常严格 https://stackoverflow.com/a/21629575 只允许您信任的网站将您的网站嵌入 iframe 中。
因为如果您允许记录跨源 iframe，任何恶意网站都可以嵌入您的网站，并且只要它们运行 rrweb，它们就可以记录您网站的所有内容。

## 如何记录跨源 iframe

在父页面中启用录制跨域 iframe:

```js
rrweb.record({
  emit(event) {}, // 所有事件都将在此处发出，包括来自跨源 iframe 的事件
  recordCrossOriginIframes: true,
});
```

在您的子页面中启用重放跨域 iframe:

```js
rrweb.record({
  emit(event) {}, // 这是 rrweb 所必需的，但子页面不会发出任何事件
  recordCrossOriginIframes: true,
});
```

## 注意事项

当跨源 iframe 录制打开时，rrweb 将检查它是否正在顶级窗口中运行。
如果不是，它将通过 `postMessage` 将事件发送到父窗口。

如果您没有在顶层窗口中运行 rrweb，则打开 `recordCrossOriginIframes` 时事件将丢失。

如果顶层窗口是一个恶意网站，它可以监听事件并将它们发送到它选择的服务器。

或者，如果您的页面上正在运行恶意脚本，他们可以监听“postMessage”，并且子窗口和父窗口之间的通信未加密。 他们可以看到事件。

## 将 rrweb 注入跨源 iframe 的选项

### 1. 网站所有者，在 iframe 中添加 rrweb

如果您拥有使用 iframe 的网站和嵌入在 iframe 中的网站，您可以通过脚本标签将 rrweb 添加到这两个页面。

### 2. 浏览器扩展

See https://developer.chrome.com/docs/extensions/mv3/content_scripts/#functionality

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

const events = []; // 包含来自所有帧的所有事件

await page.exposeFunction('_captureEvent', (event) => {
  events.push(event);
});

page.on('framenavigated', async (frame) => {
  await injectRecording(frame); // 将 rrweb 注入 iframe
});

await page.goto('https://example.com');

// 您的事件在事件数组中
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

See https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
And https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
