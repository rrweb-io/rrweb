# Cross origin iframes

Browsers prevent a parent page from accessing the contents of a cross-origin
iframe. To record those contents, run rrweb in both pages: the child recorder
forwards its events to the parent recorder via `postMessage`, and the parent
stitches them into a single recording.

Two options control this, one on each side:

- `collectFromOrigins` — set on the **parent** recorder. A list of child origins
  it accepts and trusts events from. Events from any other origin are dropped.
- `emitToOrigin` — set on the **cross-origin child** recorder. The origin of its
  parent, used so the browser only delivers its events to that parent.

> **Security warning:** Cross-origin iframe recording is not recommended unless
> you [strictly restrict](https://stackoverflow.com/a/21629575) which sites can
> embed your page and trust those sites with its recorded contents. The
> browser's cross-origin restrictions protect sensitive information. Accepting
> events with `collectFromOrigins: ['*']`, or forwarding them with
> `emitToOrigin: '*'`, removes that protection — a malicious page can then
> embed your page and collect its recorded contents, or inject fabricated
> events into your recording. Name specific origins on both sides.

## How to record cross origin iframes

In this example the parent page is hosted at `https://app.example.com` and the
child iframe at `https://widgets.example.com`.

Enable collecting from the child in your parent page:

```js
import { record } from '@rrweb/record';

record({
  emit(event) {}, // all events arrive here, including events from cross-origin iframes
  collectFromOrigins: ['https://widgets.example.com'],
});
```

Enable forwarding to the parent in your child page:

```js
import { record } from '@rrweb/record';

record({
  emitToOrigin: 'https://app.example.com',
});
```

The child forwards events to its parent instead of calling its own `emit`
callback, so the child does not need an `emit` callback.

## `collectFromOrigins` (parent side)

`collectFromOrigins` is a list of origins. The parent recorder accepts events
only from child iframes on those origins; events from any other embedded iframe
(an ad frame, an untrusted widget) are dropped before they enter the recording.
Setting it is also what turns the parent into a collector — without it the
parent ignores forwarded events.

Each entry is a full origin: scheme, hostname, and port if non-default, such as
`https://widgets.example.com:8443`. Do not include a path or trailing slash. Use
`['*']` to accept any origin, but note this re-opens the injection risk above.

## `emitToOrigin` (child side)

`emitToOrigin` is the origin of the child's **immediate** parent window. The
browser delivers the forwarded events only if the parent's origin matches; if it
does not, the parent receives nothing from that iframe. Setting it is also what
switches the child from emitting locally to forwarding upward.

Use the same origin format as above. Setting this option on the top-level
recorder has no effect — it only applies to a recorder inside a cross-origin
iframe.

## Nested cross-origin iframes

Events hop up one level at a time: each child forwards to its immediate parent,
which re-emits and (if it is itself a cross-origin child) forwards upward again.
Configure each frame with its immediate neighbours, not the top-level page.

For `A (https://top.example) › B (https://mid.example) › C (https://deep.example)`:

```js
// A — top collector
record({ emit(event) {}, collectFromOrigins: ['https://mid.example'] });

// B — middle: collects from C and forwards to A
record({
  collectFromOrigins: ['https://deep.example'],
  emitToOrigin: 'https://top.example',
});

// C — deepest: forwards to B
record({ emitToOrigin: 'https://mid.example' });
```

## Considerations

A cross-origin child recorder sends its events to the parent window via
`postMessage`. If you do not have rrweb running in the parent window, those
events are lost.

`collectFromOrigins` controls whom the parent accepts events from, and
`emitToOrigin` controls which parent the browser delivers them to. Neither
prevents scripts running in a trusted parent page from reading events once
delivered. Only name origins you trust with the recorded contents of your iframe.

## Migrating from `recordCrossOriginIframes`

`recordCrossOriginIframes` is deprecated. It enabled both halves at once and
trusted any origin. Replace it with the scoped options:

- On the parent: `recordCrossOriginIframes: true` → `collectFromOrigins: ['*']`,
  then narrow `['*']` to your real child origins.
- On a cross-origin child: `recordCrossOriginIframes: true` →
  `emitToOrigin: '<parent origin>'`.

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
