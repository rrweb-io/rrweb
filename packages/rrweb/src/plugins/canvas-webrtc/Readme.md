# rrweb canvas webrtc plugin

Plugin that live streams contents of canvas elements via webrtc

## Example of live streaming via `yarn live-stream`

https://user-images.githubusercontent.com/4106/186701616-fd71a107-5d53-423c-ba09-0395a3a0252f.mov

## Instructions

### Record side

```js
// Record side

import rrweb from 'rrweb';
import { RRWebPluginCanvasWebRTCRecord } from 'rrweb-plugin-canvas-webrtc-record';

const webRTCRecordPlugin = new RRWebPluginCanvasWebRTCRecord({
  signalSendCallback: (msg) => {
    // provides webrtc sdp offer signal & connect message
    // make sure you send this to the replayer's `webRTCReplayPlugin.signalReceive(signal)`
    sendSignalToReplayer(msg); // example of function that sends the signal to the replayer
  },
});

rrweb.record({
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

### Replay Side

```js
// Replay side
import rrweb from 'rrweb';
import { RRWebPluginCanvasWebRTCReplay } from 'rrweb-plugin-canvas-webrtc-replay';

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

const replayer = new rrweb.Replayer([], {
  UNSAFE_replayCanvas: true, // turn canvas replay on!
  liveMode: true, // live mode is needed to stream events to the replayer
  plugins: [webRTCReplayPlugin.initPlugin()],
});
replayer.startLive(); // start the replayer in live mode

replayer.addEvent(event); // call this whenever an event is received from the record script
```

## More info

https://github.com/rrweb-io/rrweb/pull/976
