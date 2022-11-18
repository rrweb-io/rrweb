# Cross origin iframes

By default browsers make it difficult to access the contents of an iframe that is hosted on a different domain. This is a security feature to prevent malicious sites from accessing sensitive information on other sites. It is possible to work around this security feature, but it is not recommended unless you [are very strict](https://stackoverflow.com/a/21629575) about allowing only the sites you trust to embed your website inside of an iframe.
Since if you allow recording cross origin iframes, any malicious website can embed your website and as long as they have rrweb running they can record all the contents of your website.

## How to record cross origin iframes

Enable recording cross-origin iframes in your parent page:

```js
rrweb.record({
  emit(event) {}, // all events will be emitted here, including events from cross origin iframes
  recordCrossOriginIframes: true,
});
```

Enable replaying cross-origin iframes in your child page:

```js
rrweb.record({
  emit(event) {}, // this is required for rrweb, but the child page will not emit any events
  recordCrossOriginIframes: true,
});
```

## Considerations

When cross origin iframe recording is turned on rrweb will check to see if it is being run in a top level window.
If it isn't it'll send the events to the parent window via `postMessage`.

If you don't have rrweb running in the top level window, the events will be lost when `recordCrossOriginIframes` is turned on.

If the top level window is a malicious website it can listen to the events and send them to a server of its choosing.

Or if a malicious script is running in on your page they can listen in on `postMessage` and as communication between the child and parent window is not encrypted. And they can see the events.

## Options for injecting rrweb into cross origin iframes

### 1. Website owners, add rrweb in the iframes

If you own the website that with the iframe and the website that is being embedded in an iframe, you can add rrweb to both pages via a script tag.

### 2. Browser extension

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

const events = []; // contains all events from all frames

await page.exposeFunction('_captureEvent', (event) => {
  events.push(event);
});

page.on('framenavigated', async (frame) => {
  await injectRecording(frame); // injects rrweb into the iframe
});

await page.goto('https://example.com');

// your events are in the events array
```

### 4. Electron

```ts
const win = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    preload: path.join(__dirname, 'rrweb-recording-script.js'),
    // this turns on preload inside iframes, but disables node integration
    nodeIntegrationInSubFrames: true,
    nodeIntegration: false,
  },
});
```

See https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
And https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
