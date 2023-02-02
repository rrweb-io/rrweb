# network recorder and replayer

Starting from v2.0.0, we add the plugin to record network output.
This feature aims to provide developers with more information about the bug scene. There are some options for recording and replaying network output.

### Enable recording network

You can enable using default option like this:

```js
rrweb.record({
  emit: function emit(event) {
    events.push(event);
  },
  // to use default record option
  plugins: [rrweb.getRecordNetworkPlugin()],
});
```

You can also customize the behavior of logger like this:

```js
rrweb.record({
  emit: function emit(event) {
    fetch('https://api.my-server.com/events', {
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
    rrweb.getRecordConsolePlugin({
      initiatorTypes: ['fetch', 'xmlhttprequest'],
      // block recording event for request to upload events to server
      ignoreRequestFn: ({ performanceEntry }) => {
        if (performanceEntry.name === 'https://api.my-server.com/events') {
          return true;
        }
        return false;
      },
      recordHeaders: true,
      recordBody: true,
      recordInitialRequests: false,
    }),
  ],
});
```

**alert**: If you are uploading events to a server, you should always use `ignoreRequestFn` to block recording events for these requests or else you will cause a nasty loop.

All options are described below:
| key | default | description |
| ---------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| initiatorTypes | ['fetch','xmlhttprequest','img',...] | Default value contains names of all [initiator types](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/initiatorType). You can override it by setting the types you need. |
| ignoreRequestFn | () => false | Block recording events for specific requests |
| recordHeaders | false | Record the request & response headers for `fetch` and `xmlhttprequest` requests |
| recordBody | false | Record the request & response bodies for `fetch` and `xmlhttprequest` requests |
| recordInitialRequests | false | Record an event for all requests prior to rrweb.record() being called |

## replay network

It is up to you to decide how to best replay your network events using the `onNetworkData` callback.

```js
const replayer = new rrweb.Replayer(events, {
  plugins: [
    rrweb.getReplayNetworkPlugin({
      onNetworkData: ({ requests }) => {
        for (const request of requests) {
          const url = request.performanceEntry.name;
          const method = request.responseMethod;
          const status = request.responseStatus;
          console.log(`${method} ${url} ${status}`);
        }
      },
    }),
  ],
});
replayer.play();
```

Description of replay option is as follows:

| key           | default   | description                                                                                |
| ------------- | --------- | ------------------------------------------------------------------------------------------ |
| onNetworkData | undefined | You could use this interface to replay the network requests in a simulated browser console |

## technical implementation

This implementation records [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) and [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) by patching their object & methods. We record document navigation using [`PerformanceNavigationTiming`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming) and we use [`PerformanceResourceTiming`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming) for recording everything else (script, img, link etc.) via [`PerformanceObserver`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver) API.

For more information please see [[network-plugin] Feat: Capture network events #1105](https://github.com/rrweb-io/rrweb/pull/1105) PR.
