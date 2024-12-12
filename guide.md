# Guide

[中文指南](./guide.zh_CN.md)

> You may also want to read the [recipes](./docs/recipes/index.md) to find some use real-world use case, or read the [design docs](./docs) to know more technical details of rrweb.

## Installation

### Direct `<script>` include

You are recommended to install rrweb via jsdelivr's CDN service:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/style.css"
/>
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.umd.min.cjs"></script>
```

Also, you can link to a specific version number that you can update manually:

```html
<script src="https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.14/dist/rrweb.umd.min.cjs"></script>
```

#### Only include the recorder code

rrweb's code includes both the record and the replay parts. Most of the time you only need to include the record part into your targeted web Apps.
This also can be done by using the `@rrweb/record` package and the CDN service:

```html
<script src="https://cdn.jsdelivr.net/npm/@rrweb/record@latest/dist/record.umd.min.cjs"></script>
```

#### Other packages

Besides the `rrweb` and `@rrweb/record` packages, rrweb also provides other packages for different usage.

- [rrweb](packages/rrweb): The core package of rrweb, including record and replay functions.
- [rrweb-player](packages/rrweb-player): A GUI for rrweb, providing a timeline and buttons for things like pause, fast-forward, and speedup.
- [rrweb-snapshot](packages/rrweb-snapshot): Handles snapshot and rebuilding features, converting the DOM and its state into a serializable data structure.
- [rrdom](packages/rrdom): A virtual dom package rrweb.
- [rrdom-nodejs](packages/rrdom-nodejs): The Node.js version of rrdom for server-side DOM operations.
- [@rrweb/all](packages/all): A package that includes `rrweb` and `@rrweb/packer` for easy install.
- [@rrweb/record](packages/record): A package for recording rrweb sessions.
- [@rrweb/replay](packages/replay): A package for replaying rrweb sessions.
- [@rrweb/packer](packages/packer): A package for packing and unpacking rrweb data.
- [@rrweb/types](packages/types): Contains types shared across rrweb packages.
- [@rrweb/utils](packages/utils): Contains utility functions shared across rrweb packages.
- [web-extension](packages/web-extension): A web extension for rrweb.
- [rrvideo](packages/rrvideo): A package for handling video operations in rrweb.
- [@rrweb/rrweb-plugin-console-record](packages/plugins/rrweb-plugin-console-record): A plugin for recording console logs.
- [@rrweb/rrweb-plugin-console-replay](packages/plugins/rrweb-plugin-console-replay): A plugin for replaying console logs.
- [@rrweb/rrweb-plugin-sequential-id-record](packages/plugins/rrweb-plugin-sequential-id-record): A plugin for recording sequential IDs.
- [@rrweb/rrweb-plugin-sequential-id-replay](packages/plugins/rrweb-plugin-sequential-id-replay): A plugin for replaying sequential IDs.
- [@rrweb/rrweb-plugin-canvas-webrtc-record](packages/plugins/rrweb-plugin-canvas-webrtc-record): A plugin for stream `<canvas>` via WebRTC.
- [@rrweb/rrweb-plugin-canvas-webrtc-replay](packages/plugins/rrweb-plugin-canvas-webrtc-replay): A plugin for playing streamed `<canvas>` via WebRTC.

### NPM

```shell
npm install --save rrweb
```

rrweb provides both commonJS and ES modules bundles, which are easy to use with the popular bundlers.

### Compatibility Note

rrweb does **not** support IE11 and below because it uses the `MutationObserver` API which was supported by [these browsers](https://caniuse.com/#feat=mutationobserver).

## Getting Started

### Record

The following sample code will use the variable `rrweb` which is the default exporter of this library.

```js
rrweb.record({
  emit(event) {
    // store the event in any way you like
  },
});
```

During recording, the recorder will emit when there is some event incurred, all you need to do is to store the emitted events in any way you like.

The `record` method returns a function which can be called to stop events from firing:

```js
let stopFn = rrweb.record({
  emit(event) {
    if (events.length > 100) {
      // stop after 100 events
      stopFn();
    }
  },
});
```

A more real-world usage may look like this:

```js
let events = [];

rrweb.record({
  emit(event) {
    // push event into the events array
    events.push(event);
  },
});

// this function will send events to the backend and reset the events array
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

// save events every 10 seconds
setInterval(save, 10 * 1000);
```

#### Options

The parameter of `rrweb.record` accepts the following options.

| key                      | default            | description                                                                                                                                                                                   |
| ------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| emit                     | required           | the callback function to get emitted events                                                                                                                                                   |
| checkoutEveryNth         | -                  | take a full snapshot after every N events<br />refer to the [checkout](#checkout) chapter                                                                                                     |
| checkoutEveryNms         | -                  | take a full snapshot after every N ms<br />refer to the [checkout](#checkout) chapter                                                                                                         |
| blockClass               | 'rr-block'         | Use a string or RegExp to configure which elements should be blocked, refer to the [privacy](#privacy) chapter                                                                                |
| blockSelector            | null               | Use a string to configure which selector should be blocked, refer to the [privacy](#privacy) chapter                                                                                          |
| ignoreClass              | 'rr-ignore'        | Use a string or RegExp to configure which elements should be ignored, refer to the [privacy](#privacy) chapter                                                                                |
| ignoreSelector           | null               | Use a string to configure which selector should be ignored, refer to the [privacy](#privacy) chapter                                                                                          |
| ignoreCSSAttributes      | null               | array of CSS attributes that should be ignored                                                                                                                                                |
| maskTextClass            | 'rr-mask'          | Use a string or RegExp to configure which elements should be masked, refer to the [privacy](#privacy) chapter                                                                                 |
| maskTextSelector         | null               | Use a string to configure which selector should be masked, refer to the [privacy](#privacy) chapter                                                                                           |
| maskAllInputs            | false              | mask all input content as \*                                                                                                                                                                  |
| maskInputOptions         | { password: true } | mask some kinds of input \*<br />refer to the [list](https://github.com/rrweb-io/rrweb/blob/588164aa12f1d94576f89ae0210b98f6e971c895/packages/rrweb-snapshot/src/types.ts#L77-L95)            |
| maskInputFn              | -                  | customize mask input content recording logic                                                                                                                                                  |
| maskTextFn               | -                  | customize mask text content recording logic                                                                                                                                                   |
| slimDOMOptions           | {}                 | remove unnecessary parts of the DOM <br />refer to the [list](https://github.com/rrweb-io/rrweb/blob/588164aa12f1d94576f89ae0210b98f6e971c895/packages/rrweb-snapshot/src/types.ts#L97-L108)  |
| dataURLOptions           | {}                 | Canvas image format and quality ,This parameter will be passed to the OffscreenCanvas.convertToBlob(),Using this parameter effectively reduces the size of the recorded data                  |
| inlineStylesheet         | true               | whether to inline the stylesheet in the events                                                                                                                                                |
| hooks                    | {}                 | hooks for events<br />refer to the [list](https://github.com/rrweb-io/rrweb/blob/9488deb6d54a5f04350c063d942da5e96ab74075/src/types.ts#L207)                                                  |
| packFn                   | -                  | refer to the [storage optimization recipe](./docs/recipes/optimize-storage.md)                                                                                                                |
| sampling                 | -                  | refer to the [storage optimization recipe](./docs/recipes/optimize-storage.md)                                                                                                                |
| recordCanvas             | false              | Whether to record the canvas element. Available options:<br/>`false`, <br/>`true`                                                                                                             |
| recordCrossOriginIframes | false              | Whether to record cross origin iframes. rrweb has to be injected in each child iframe for this to work. Available options:<br/>`false`, <br/>`true`                                           |
| recordAfter              | 'load'             | If the document is not ready, then the recorder will start recording after the specified event is fired. Available options: `DOMContentLoaded`, `load`                                        |
| inlineImages             | false              | whether to record the image content                                                                                                                                                           |
| collectFonts             | false              | whether to collect fonts in the website                                                                                                                                                       |
| userTriggeredOnInput     | false              | whether to add `userTriggered` on input events that indicates if this event was triggered directly by the user or not. [What is `userTriggered`?](https://github.com/rrweb-io/rrweb/pull/495) |
| plugins                  | []                 | load plugins to provide extended record functions. [What is plugins?](./docs/recipes/plugin.md)                                                                                               |
| errorHandler             | -                  | A callback that is called if something inside of rrweb throws an error. The callback receives the error as argument.                                                                          |

#### Privacy

You may find some contents on the webpage which are not willing to be recorded, then you can use the following approaches:

- An element with the class name `.rr-block` will not be recorded. Instead, it will replay as a placeholder with the same dimension.
- An element with the class name `.rr-ignore` will not record its input events.
- All text of elements with the class name `.rr-mask` and their children will be masked.
- `input[type="password"]` will be masked by default.
- Mask options to mask the content in input elements.

#### Checkout

By default, all the emitted events are required to replay a session and if you do not want to store all the events, you can use the checkout config.

**Most of the time you do not need to configure this**. But if you want to do something like capturing just the last N events from when an error has occurred, here is an example:

```js
// We use a two-dimensional array to store multiple events array
const eventsMatrix = [[]];

rrweb.record({
  emit(event, isCheckout) {
    // isCheckout is a flag to tell you the events has been checkout
    if (isCheckout) {
      eventsMatrix.push([]);
    }
    const lastEvents = eventsMatrix[eventsMatrix.length - 1];
    lastEvents.push(event);
  },
  checkoutEveryNth: 200, // checkout every 200 events
});

// send last two events array to the backend
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

Due to the incremental-snapshot-chain mechanism rrweb used, we can not capture the last N events accurately. With the sample code above, you will finally get the last 200 to 400 events been sent to your backend.

Similarly, you can also configure `checkoutEveryNms` to capture the last N minutes events:

```js
// We use a two-dimensional array to store multiple events array
const eventsMatrix = [[]];

rrweb.record({
  emit(event, isCheckout) {
    // isCheckout is a flag to tell you the events has been checkout
    if (isCheckout) {
      eventsMatrix.push([]);
    }
    const lastEvents = eventsMatrix[eventsMatrix.length - 1];
    lastEvents.push(event);
  },
  checkoutEveryNms: 5 * 60 * 1000, // checkout every 5 minutes
});

// send last two events array to the backend
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

With the sample code above, you will finally get the last 5 to 10 minutes of events been sent to your backend.

### Replay

You need to include the style sheet before replay:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/style.css"
/>
```

And then initialize the replayer with the following code:

```js
const events = YOUR_EVENTS;

const replayer = new rrweb.Replayer(events);
replayer.play();
```

#### Control the replayer by API

```js
const replayer = new rrweb.Replayer(events);

// play
replayer.play();

// play from the third seconds
replayer.play(3000);

// pause
replayer.pause();

// pause at the fifth seconds
replayer.pause(5000);

// destroy the replayer (hint: this operation is irreversible)
replayer.destroy();
```

#### Options

The replayer accepts options as its constructor's second parameter, and it has the following options:

| key                     | default       | description                                                                                                                                                                                                                    |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| speed                   | 1             | replay speed ratio                                                                                                                                                                                                             |
| root                    | document.body | the root element of replayer                                                                                                                                                                                                   |
| loadTimeout             | 0             | timeout of loading remote style sheet                                                                                                                                                                                          |
| skipInactive            | false         | whether to skip inactive time                                                                                                                                                                                                  |
| inactivePeriodThreshold | 10000         | the threshold in milliseconds for what should be considered an inactive period                                                                                                                                                 |
| showWarning             | true          | whether to print warning messages during replay                                                                                                                                                                                |
| showDebug               | false         | whether to print debug messages during replay                                                                                                                                                                                  |
| blockClass              | 'rr-block'    | element with the class name will display as a blocked area                                                                                                                                                                     |
| liveMode                | false         | whether to enable live mode                                                                                                                                                                                                    |
| insertStyleRules        | []            | accepts multiple CSS rule string, which will be injected into the replay iframe                                                                                                                                                |
| triggerFocus            | true          | whether to trigger focus during replay                                                                                                                                                                                         |
| UNSAFE_replayCanvas     | false         | whether to replay the canvas element. **Enable this will remove the sandbox, which is unsafe.**                                                                                                                                |
| pauseAnimation          | true          | whether to pause CSS animation when the replayer is paused                                                                                                                                                                     |
| mouseTail               | true          | whether to show mouse tail during replay. Set to false to disable mouse tail. A complete config can be found in this [type](https://github.com/rrweb-io/rrweb/blob/9488deb6d54a5f04350c063d942da5e96ab74075/src/types.ts#L407) |
| unpackFn                | -             | refer to the [storage optimization recipe](./docs/recipes/optimize-storage.md)                                                                                                                                                 |
| logConfig               | -             | configuration of console output playback, refer to the [console recipe](./docs/recipes/console.md)                                                                                                                             |
| plugins                 | []            | load plugins to provide extended replay functions. [What is plugins?](./docs/recipes/plugin.md)                                                                                                                                |
| useVirtualDom           | true          | whether to use Virtual Dom optimization in the process of skipping to a new point of time                                                                                                                                      |
| logger                  | console       | The logger object used by the replayer to print warnings or errors                                                                                                                                                             |

#### Use rrweb-player

Since rrweb's replayer ([@rrweb/replay](packages/replay/)) only provides a basic UI, you can choose [rrweb-player](packages/rrweb-player/) which is based on rrweb's public APIs but has a feature-rich replayer UI.

##### Installation

rrweb-player can also be included with `<script>`：

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/style.css"
/>
<script src="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/index.js"></script>
```

Or installed by using NPM：

```shell
npm install --save rrweb-player
```

```js
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';
```

##### Usage

```js
new rrwebPlayer({
  target: document.body, // customizable root element
  props: {
    events,
  },
});
```

##### Options

| key            | default      | description                                                          |
| -------------- | ------------ | -------------------------------------------------------------------- |
| events         | []           | the events for replaying                                             |
| width          | 1024         | the width of the replayer                                            |
| height         | 576          | the height of the replayer                                           |
| maxScale       | 1            | the maximum scale of the replayer (1 = 100%), set to 0 for unlimited |
| autoPlay       | true         | whether to autoplay                                                  |
| speedOption    | [1, 2, 4, 8] | speed options in UI                                                  |
| showController | true         | whether to show the controller UI                                    |
| tags           | {}           | customize the custom events style with a key-value map               |
| ...            | -            | all the rrweb Replayer options will be bypassed                      |

#### Events

Developers may want to extend the rrweb's replayer or respond to its events. Such as giving notification when the replayer starts to skip inactive time.
So rrweb expose a public API `on` which allow developers to listen to the events and customize the reactions, and it has the following events:

```js
const replayer = new rrweb.Replayer(events);
replayer.on(EVENT_NAME, (payload) => {
  ...
})
```

The event list:

| Event                  | Description                         | Value             |
| ---------------------- | ----------------------------------- | ----------------- |
| start                  | started to replay                   | -                 |
| pause                  | paused the replay                   | -                 |
| finish                 | finished the replay                 | -                 |
| resize                 | the viewport has changed            | { width, height } |
| fullsnapshot-rebuilded | rebuilded a full snapshot           | event             |
| load-stylesheet-start  | started to load remote stylesheets  | -                 |
| load-stylesheet-end    | loaded remote stylesheets           | -                 |
| skip-start             | started to skip inactive time       | { speed }         |
| skip-end               | skipped inactive time               | { speed }         |
| mouse-interaction      | mouse interaction has been replayed | { type, target }  |
| event-cast             | event has been replayed             | event             |
| custom-event           | custom event has been replayed      | event             |
| destroy                | destroyed the replayer              | -                 |

The rrweb-replayer also re-expose the event listener via a `component.addEventListener` API.

And there are three rrweb-replayer event will be emitted in the same way:

| Event                  | Description                      | Value       |
| ---------------------- | -------------------------------- | ----------- |
| ui-update-current-time | current time has changed         | { payload } |
| ui-update-player-state | current player state has changed | { payload } |
| ui-update-progress     | current progress has changed     | { payload } |

## REPL tool

You can also play with rrweb by using the REPL testing tool which does not need installation.

Run `yarn repl` to launch a browser and ask for a URL you want to test on the CLI:

```
Enter the url you want to record, e.g https://react-redux.realworld.io:
```

Waiting for the browser to open the specified page and print the following messages on the CLI:

```
Enter the url you want to record, e.g https://react-redux.realworld.io: https://github.com
Going to open https://github.com...
Ready to record. You can do any interaction on the page.
Once you want to finish the recording, enter 'y' to start replay:
```

At this point, you can interact on the web page. After the desired operations have been recorded, enter 'y' on the CLI, and the test tool will replay the operations to verify whether the recording was successful.

The following messages will be printed on the CLI during replay:

```
Enter 'y' to persistently store these recorded events:
```

At this point, you can enter 'y' again on the CLI. The test tool will save the recorded session into a static HTML file and prompt for the location:

```
Saved at PATH_TO_YOUR_REPO/temp/replay_2018_11_23T07_53_30.html
```

This file uses the latest rrweb bundle code, so we can run `npm run bundle:browser` after patching the code, then refresh the static file to see and debug the impact of the latest code on replay.
