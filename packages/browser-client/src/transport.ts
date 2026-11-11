import { EventType } from '@rrweb/types';
import type { customEvent, eventWithTime } from '@rrweb/types';
import { nowTimestamp } from '@rrweb/utils';

import {
  ArrayQueue,
  ExponentialBackoff,
  Websocket,
  WebsocketBuilder,
  WebsocketEvent,
} from 'websocket-ts';

declare const __RRWEB_BROWSER_CLIENT_VERSION__: string;
declare const __RRWEB_BROWSER_CLIENT_COMMIT_HASH__: string;

export type nameValues = Record<string, string | boolean | number>;

export type customEventWithTime = customEvent & {
  timestamp: number;
};

export type TransportOptions = {
  publicApiKey: string;
  recordingId: string;
  serverUrl?: string;
  meta: nameValues;
};

export type Transport = {
  send(event: eventWithTime): void;
  /** POST anything buffered (what start() does on page hidden). */
  flush(): void;
  /** Close the socket and let the next send() open a new one (page freeze). */
  disconnect(): void;
  /**
   * Sends 'close-permanent' or 'close-temporary', then closes.
   * stop(true) first POSTs anything still buffered, in order, followed by
   * close-permanent; stop(false) drops what is buffered. When the socket is
   * not open, or a POST is still in flight, the close event is POSTed after
   * every earlier POST settles. The promise resolves once delivery has been
   * attempted.
   */
  stop(permanent: boolean): Promise<void>;
};

type ServerMessage =
  | { type: 'error' }
  | { type: 'upstream-result'; ok?: boolean }
  | { type?: unknown; ok?: unknown };

const defaultServerUrl =
  'https://api.rrweb.com/recordings/{recordingId}/events/ws';
const wsLimit = 10e5; // this is approximate and depends on the browser, also on how unicode is encoded (we are comparing against the length of a javascript string)

function isServerMessage(value: unknown): value is ServerMessage {
  return typeof value === 'object' && value !== null;
}

export function createTransport(options: TransportOptions): Transport {
  const { publicApiKey, recordingId, meta } = options;
  let serverUrl = options.serverUrl ?? defaultServerUrl;

  let ws: Websocket | undefined;
  /** Whether send() ever ran; until then there is no recording to close. */
  let started = false;
  /**
   * Why send() buffers instead of writing to the socket. 'socket-closed'
   * clears once the socket reopens; 'server-error' stays until disconnect or
   * stop, since the server asked us to stop streaming.
   */
  let paused: 'no' | 'socket-closed' | 'server-error' = 'no';
  let fallbackPosting: ReturnType<typeof setInterval> | undefined;
  const buffer: ArrayQueue<string> = new ArrayQueue();
  /** POSTs not yet settled; the close event must not overtake them. */
  const uploads = new Set<Promise<unknown>>();
  const upload = (body: ArrayQueue<string> | string) => {
    const request = postData(postUrl, publicApiKey, body);
    uploads.add(request);
    const settle = () => uploads.delete(request);
    request.then(settle, settle);
    return request;
  };

  const initialPayload: nameValues = { ...meta };

  // the expected replacement of recording id
  serverUrl = serverUrl.replace('{recordingId}', recordingId);
  serverUrl = serverUrl.replace('%7BrecordingId%7D', recordingId); // as mangled by `new URL`

  const sURL = new URL(serverUrl);
  if (!serverUrl.includes(recordingId)) {
    // '{recordingId}' wasn't in the url;
    // pass as a query string param instead
    sURL.searchParams.set('recordingId', recordingId);
    serverUrl = sURL.href;
    // also include in the payload in case query string gets lost during upgrade or proxying
    initialPayload.recordingId = recordingId;
  }
  if (sURL.pathname.endsWith('/ws')) {
    sURL.pathname = sURL.pathname.slice(0, -3);
  }
  const postUrl = sURL.href;

  initialPayload.recordVersion = __RRWEB_BROWSER_CLIENT_VERSION__;
  initialPayload.recordCommitHash = __RRWEB_BROWSER_CLIENT_COMMIT_HASH__;

  const metaEvent: customEventWithTime = {
    timestamp: nowTimestamp(),
    type: EventType.Custom,
    data: {
      tag: 'recording-meta',
      payload: initialPayload,
    },
  };
  // metadata event should be the first seen server side
  buffer.add(JSON.stringify(metaEvent));

  const handleMessage = (_: Websocket, ev: MessageEvent) => {
    const parsedEvent: unknown = JSON.parse(String(ev.data));
    if (
      isServerMessage(parsedEvent) &&
      (parsedEvent.type === 'error' ||
        (parsedEvent.type === 'upstream-result' && !parsedEvent.ok))
    ) {
      console.warn('received error, pausing websockets:', parsedEvent);
      paused = 'server-error';
    } else {
      console.log(`received message: ${String(ev.data)}`);
    }
  };

  const stopFallbackPosting = () => {
    clearInterval(fallbackPosting);
    fallbackPosting = undefined;
  };

  const startFallbackPosting = () => {
    if (fallbackPosting !== undefined) return;
    fallbackPosting = setInterval(() => {
      if (buffer.length()) {
        void upload(buffer).catch((error) => {
          stopFallbackPosting();
          console.error('Error periodically POSTing events:', error);
        });
      }
    }, 5 * 1000);
  };

  const connect = (): Websocket => {
    const wsUrl = new URL(serverUrl);
    if (publicApiKey) {
      wsUrl.searchParams.set('token', publicApiKey);
    }
    wsUrl.protocol = wsUrl.protocol.replace('http', 'ws'); // testing/puppeteer: SyntaxError: Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. 'https' is not allowed.

    const socket = new WebsocketBuilder(wsUrl.href)
      .withBuffer(buffer) // when disconnected
      .withBackoff(
        new ExponentialBackoff(500 + Math.round(1000 * Math.random()), 6),
      ) // retry around every 1s, 2s, 4s, 8s, maxing out with a retry every ~1minute
      .build();

    startFallbackPosting(); // until the first open
    // Fired on the first open and on every reconnect after a backoff retry.
    socket.addEventListener(WebsocketEvent.open, () => {
      stopFallbackPosting();
      if (paused === 'socket-closed') paused = 'no';
    });
    socket.addEventListener(WebsocketEvent.close, () => {
      if (socket.closedByUser) return; // disconnect() or stop()
      // fall back to POSTing while the backoff algorithm reconnects
      if (paused === 'no') paused = 'socket-closed';
      startFallbackPosting();
    });
    socket.addEventListener(WebsocketEvent.message, handleMessage);
    return socket;
  };

  return {
    send(event) {
      if (!ws) {
        // don't make a connection until the first event is sent
        ws = connect();
        started = true;
      }
      const eventStr = JSON.stringify(event);
      // TODO: add browser native compression
      if (eventStr.length > wsLimit) {
        void upload(eventStr).catch((error) => {
          console.error('Error POSTing a large event:', error);
        });
      } else if (ws && paused === 'no') {
        ws.send(eventStr);
      } else {
        buffer.add(eventStr);
      }
    },

    flush() {
      if ((!ws || paused !== 'no') && buffer.length()) {
        void upload(buffer).catch((error) => {
          console.error('Error POSTing buffered events:', error);
        });
      }
    },

    disconnect() {
      stopFallbackPosting();
      if (ws) {
        ws.close();
        paused = 'no';
        ws = undefined; // so `send` can restart it again if page is unfrozen
      }
    },

    async stop(permanent) {
      const closeEvent: customEventWithTime = {
        timestamp: nowTimestamp(),
        type: EventType.Custom,
        data: {
          tag: 'close-' + (permanent ? 'permanent' : 'temporary'),
          payload: {},
        },
      };
      const closeStr = JSON.stringify(closeEvent);
      stopFallbackPosting();
      if (!started) {
        buffer.clear();
        return;
      }
      // ws is undefined after disconnect(); the buffer still goes out below.
      const socket = ws;
      ws = undefined;
      paused = 'no';
      if (!permanent) buffer.clear();
      if (
        socket?.readyState === WebSocket.OPEN &&
        !buffer.length() &&
        !uploads.size
      ) {
        socket.send(closeStr);
        socket.close();
        return;
      }
      // No open socket to carry the close event, events still buffered
      // (socket connecting, or paused for the POST fallback), or a POST in
      // flight: deliver everything in order, then the close event.
      socket?.close();
      await Promise.allSettled([...uploads]);
      buffer.add(closeStr);
      try {
        await postData(postUrl, publicApiKey, buffer);
      } catch (error) {
        console.error('Error POSTing final events:', error);
      }
    },
  };
}

async function postData(
  postUrl: string,
  publicApiKey: string,
  buffer: ArrayQueue<string> | string,
) {
  const keepaliveLimit = 65000;
  let done = false;
  const responses: Response[] = [];
  do {
    const toSend: string[] = [];
    let body;
    if (buffer instanceof ArrayQueue) {
      // this clears the buffer so no need to call buffer.clear()
      let sendSize = 0;
      done = true;
      for (
        let eventStr = buffer.read();
        eventStr !== undefined;
        eventStr = buffer.read()
      ) {
        toSend.push(eventStr);
        sendSize += eventStr.length;
        if (sendSize > keepaliveLimit) {
          done = false;
          break;
        }
      }
      body = toSend.join('\n');
    } else {
      body = buffer;
      done = true;
    }
    // eslint-disable-next-line compat/compat -- fetch is the runtime transport for POST fallback in supported browsers.
    const response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
        Authorization: `Bearer ${publicApiKey}`,
      },
      body,
      keepalive: body.length < keepaliveLimit, // don't abort POST after end of session (must be under the limit)
    });
    responses.push(response);
    if (!response.ok) {
      if (buffer instanceof ArrayQueue) {
        // re-queue events in case we can reconnect next time or with ws
        const rest: string[] = [];
        for (
          let eventStr = buffer.read();
          eventStr !== undefined;
          eventStr = buffer.read()
        ) {
          rest.push(eventStr);
        }
        [...toSend, ...rest].forEach((eventStr) => buffer.add(eventStr));
      }
      break;
    } else if (done) {
      break;
    }
  } while (!done);
  const badResponse = responses.find((r) => r.status >= 300);
  if (badResponse) {
    let badResponseInfo = `${badResponse.status} ${badResponse.statusText}`;
    if (!badResponse.bodyUsed) {
      badResponseInfo +=
        '\nresponse body:' + JSON.stringify(await badResponse.json());
    }
    throw new Error(`Bad response from POST: ${badResponseInfo}`);
  }
  return responses;
}
