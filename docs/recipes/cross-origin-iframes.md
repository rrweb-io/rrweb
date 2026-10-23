# Cross origin iframes

Browsers prevent a parent page from accessing the contents of a cross-origin
iframe. To record those contents, run rrweb in both pages and enable
`recordCrossOriginIframes`. The iframe sends its recording events to its parent.

> **Security warning:** Cross-origin iframe recording is not recommended unless
> you strictly restrict which sites can embed your page and trust those sites
> with its recorded contents. The browser's cross-origin restrictions protect
> sensitive information. With the default `crossOriginIframeParentOrigin: '*'`,
> a malicious website can embed your page and collect its recorded contents.

Set `crossOriginIframeParentOrigin` in the child page to restrict event delivery
to a trusted parent origin. This controls where events are delivered; it does
not restrict which websites can embed your page.

## How to record cross origin iframes

Enable recording cross-origin iframes in your parent page:

```js
import { record } from '@rrweb/record';

record({
  emit(event) {}, // all events will be emitted here, including events from cross origin iframes
  recordCrossOriginIframes: true,
});
```

Enable recording in your child page. In this example, the parent page is hosted
at `https://app.example.com`:

```js
import { record } from '@rrweb/record';

record({
  recordCrossOriginIframes: true,
  crossOriginIframeParentOrigin: 'https://app.example.com',
});
```

The child forwards events to its parent instead of calling its own `emit`
callback, so the child does not need an `emit` callback.

## Restrict event delivery to a parent origin

`crossOriginIframeParentOrigin` is a string that defaults to `'*'`. Set it in
each cross-origin child recorder to the origin of its immediate parent window.
Use the scheme, hostname, and port if needed, such as
`https://app.example.com:8443`. Do not include a path or trailing slash.

The browser delivers events only if the parent's origin matches. If it does not
match, the parent receives no recording events from that iframe. Setting this
option on the top-level recorder does not configure the child recorders.
The option applies only when `recordCrossOriginIframes` is `true` and the recorder
forwards events from a cross-origin iframe.

For nested cross-origin iframes, configure each child with its immediate parent's
origin. This can differ from the top-level page's origin.

## Considerations

When cross origin iframe recording is turned on rrweb will check to see if it is being run in a top level window.
If it isn't it'll send the events to the parent window via `postMessage`.

If you don't have rrweb running in the top level window, the events will be lost when `recordCrossOriginIframes` is turned on.

With the default `crossOriginIframeParentOrigin: '*'`, any parent website can
receive the events and send them to a server of its choosing.

Restricting the parent origin controls where the browser delivers events. It
does not prevent scripts running in the trusted parent page from reading them.
Only allow parent origins you trust with the recorded contents of your iframe.

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
