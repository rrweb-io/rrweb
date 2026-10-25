# rrweb canvas webrtc plugin

Plugin that live streams contents of canvas elements via webrtc

## Example of live streaming via `yarn live-stream`

https://user-images.githubusercontent.com/4106/186701616-fd71a107-5d53-423c-ba09-0395a3a0252f.mov

## Instructions

### Record side

```js
// Record side

import { record } from '@rrweb/record';
import { RRWebPluginCanvasWebRTCRecord } from '@rrweb/rrweb-plugin-canvas-webrtc-record';

const webRTCRecordPlugin = new RRWebPluginCanvasWebRTCRecord({
  signalSendCallback: (msg) => {
    // provides webrtc sdp offer signal & connect message
    // make sure you send this to the replayer's `webRTCReplayPlugin.signalReceive(signal)`
    sendSignalToReplayer(msg); // example of function that sends the signal to the replayer
  },
});

record({
  emit: (event) => {
    // send these events to the `replayer.addEvent(event)`, how you do that is up to you
    // you can send them to a server for example which can then send them to the replayer
    sendEventToReplayer(event); // example of function that sends the event to the replayer
  },
  plugins: [
    // add the plugin to the list of plugins, and initialize it via `.initPlugin()`
    webRTCRecordPlugin.initPlugin(),
  ],
  recordCanvas: false, // we don't want canvas recording turned on, we're going to do that via the plugin
});
```

### Cross-origin recording

The plugin rejects cross-origin `postMessage` commands by default. This setting
is separate from rrweb's `recordCrossOriginIframes` option. Enabling that option
in `record()` does not enable cross-origin canvas streaming in this plugin.

For cross-origin canvas streaming, set `recordCrossOriginIframes: true` in the
plugin constructor in both the recording root page and each participating iframe.
Also enable rrweb's `recordCrossOriginIframes` option for cross-origin event recording.

```js
const webRTCRecordPlugin = new RRWebPluginCanvasWebRTCRecord({
  signalSendCallback: sendSignalToReplayer,
  recordCrossOriginIframes: true,
});
```

Enabling this option accepts commands from any origin. It does not authenticate
the embedding page or restrict signaling to an allowlist. A page with this option
enabled must restrict embedding to trusted origins, for example with a
`Content-Security-Policy: frame-ancestors` response header. Leave the option
disabled if the page may be embedded by untrusted sites.

Same-origin commands continue to work without opt-in. Messages from opaque origins,
such as sandboxed frames without `allow-same-origin`, require explicit opt-in.

### Replay Side

```js
// Replay side
import { Replayer } from '@rrweb/replay';
import { RRWebPluginCanvasWebRTCReplay } from '@rrweb/rrweb-plugin-canvas-webrtc-replay';

const webRTCReplayPlugin = new RRWebPluginCanvasWebRTCReplay({
  canvasFoundCallback(canvas, context) {
    console.log('canvas', canvas);
    // send the canvas id to `webRTCRecordPlugin.setupStream(id)`, how you do that is up to you
    // you can send them to a server for example which can then send them to the replayer
    sendCanvasIdToRecordScript(context.id); // example of function that sends the id to the record script
  },
  signalSendCallback(signal) {
    // provides webrtc sdp offer signal & connect message
    // make sure you send this to the record script's `webRTCRecordPlugin.signalReceive(signal)`
    sendSignalToRecordScript(signal); // example of function that sends the signal to the record script
  },
});

const replayer = new Replayer([], {
  UNSAFE_replayCanvas: true, // turn canvas replay on!
  liveMode: true, // live mode is needed to stream events to the replayer
  plugins: [webRTCReplayPlugin.initPlugin()],
});
replayer.startLive(); // start the replayer in live mode

replayer.addEvent(event); // call this whenever an event is received from the record script
```

**Enabling canvas replay adds `allow-scripts` to the replay iframe and opts out of rrweb's sandbox script-execution protection. Only use `UNSAFE_replayCanvas` for replay data whose risk you accept.**

## More info

https://github.com/rrweb-io/rrweb/pull/976
