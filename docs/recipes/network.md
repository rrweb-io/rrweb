# Network Recorder and Replayer

This feature aims to provide developers with more information about the bug scene. There are some options for recording and replaying network output.

### Enable Recording Network

You can enable using default option like this:

```js
import { record } from '@rrweb/record';
import { getRecordNetworkPlugin } from '@rrweb/rrweb-plugin-network-record';

record({
  emit: function emit(event) {
    events.push(event);
  },
  // to use default record option
  plugins: [getRecordNetworkPlugin()],
});
```

You can also customize the behavior of logger like this:

```js
import { record } from '@rrweb/record';
import { getRecordNetworkPlugin } from '@rrweb/rrweb-plugin-network-record';

const recordingId = crypto.randomUUID();

record({
  emit: function emit(event) {
    fetch(`https://api.rrweb.com/recordings/${recordingId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [event],
      }),
    });
  },
  // customized record options
  plugins: [
    getRecordNetworkPlugin({
      initiatorTypes: ['fetch', 'xmlhttprequest'],
      // mask/block recording event for request
      transformRequestFn: (request) => {
        // request.name is url
        if (request.name.includes('api.rrweb.com')) return; // skip request
        delete request.requestHeaders?.Authorization; // remove sensitive data
        request.responseBody = maskTextFn(request.responseBody);
        return request;
      },
      recordHeaders: true,
      recordBody: true,
      recordInitialRequests: false,
    }),
  ],
});
```

**alert**: If you are uploading events to a server, you should always use `transformRequestFn` to mask/block recording events for these requests or else you will cause a nasty loop.

All options are described below:

| key                   | default                                | description                                                                                                                                                                                         |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| initiatorTypes        | `['fetch','xmlhttprequest','img',...]` | Default value contains names of all [initiator types](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/initiatorType). You can override it by setting the types you need. |
| transformRequestFn    | `(request) => request`                 | Transform recording event for request to block (skip) or mask/transform request (e.g. to hide sensitive data)                                                                                       |
| recordHeaders         | `false`                                | Record the request & response headers for `fetch` and `xmlhttprequest` requests                                                                                                                     |
| recordBody            | `false`                                | Record the request & response bodies for `fetch` and `xmlhttprequest` requests                                                                                                                      |
| recordInitialRequests | `false`                                | Record an event for all requests prior to `record()` being called                                                                                                                                   |

## Replay Network Requests

It is up to you to decide how to best replay your network events using the `onNetworkData` callback.

```js
import { Replayer } from '@rrweb/replay';
import { getReplayNetworkPlugin } from '@rrweb/rrweb-plugin-network-replay';

const replayer = new Replayer(events, {
  plugins: [
    getReplayNetworkPlugin({
      onNetworkData: ({ requests }) => {
        for (const request of requests) {
          const name = request.name; // url
          const method = request.method;
          const status = request.status;
          console.log(`${method} ${name} ${status}`);
        }
      },
    }),
  ],
});
replayer.play();
```

Description of replay option is as follows:

| key           | default     | description                                                                                |
| ------------- | ----------- | ------------------------------------------------------------------------------------------ |
| onNetworkData | `undefined` | You could use this interface to replay the network requests in a simulated browser console |

## Technical Implementation

This implementation records [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) by patching their object & methods. We record document navigation using [`PerformanceNavigationTiming`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming) and we use [`PerformanceResourceTiming`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) for recording everything else (script, img, link etc.) via [`PerformanceObserver`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) API.

For more information please see [[network-plugin] Feat: Capture network events #1105](https://github.com/rrweb-io/rrweb/pull/1105) PR.
