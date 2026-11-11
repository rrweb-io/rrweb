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

/**
 * Whether stop() or postEvents() got everything to the server. `unsent` holds
 * the serialized events (one JSON string each, in order) that did not arrive,
 * so the caller can keep them and retry with postEvents() later.
 */
export type DeliveryResult =
  | { delivered: true }
  | { delivered: false; error: Error; unsent: string[] };

export type Transport = {
  send(event: eventWithTime): void;
  /**
   * POST anything buffered, unless the socket is open and streaming (what
   * start() does on page hidden). Events wait in the buffer while the socket
   * is connecting, reconnecting or paused by a server error.
   */
  flush(): void;
  /** Close the socket and let the next send() open a new one (page freeze). */
  disconnect(): void;
  /**
   * Sends 'close-permanent' or 'close-temporary', then closes.
   * stop(true) first POSTs anything still buffered, in order, followed by
   * close-permanent; stop(false) drops what is buffered. When the socket is
   * not open, or a POST is still in flight, the close event is POSTed after
   * every earlier POST settles. The promise never rejects: it resolves to
   * `{ delivered: false, error, unsent }` when a POST failed, with every event
   * the server did not accept, the close event included.
   */
  stop(permanent: boolean): Promise<DeliveryResult>;
};

type ServerMessage =
  | { type: 'error' }
  | { type: 'upstream-result'; ok?: boolean }
  | { type?: unknown; ok?: unknown };

const defaultServerUrl =
  'https://api.rrweb.com/recordings/{recordingId}/events/ws';
/** WebSocket.OPEN; not every runtime defines the WebSocket global. */
const SOCKET_OPEN = 1;
const wsLimit = 10e5; // this is approximate and depends on the browser, also on how unicode is encoded (we are comparing against the length of a javascript string)

function isServerMessage(value: unknown): value is ServerMessage {
  return typeof value === 'object' && value !== null;
}

export function createTransport(options: TransportOptions): Transport {
  const { publicApiKey, recordingId, meta } = options;

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
  /** websocket-ts sends this over the socket whenever the socket opens. */
  const buffer: ArrayQueue<string> = new ArrayQueue();
  /**
   * Events too large for the socket whose own POST failed. They never go into
   * `buffer`, so the socket never carries them: flush(), the fallback POST and
   * stop(true) POST them again, stop(true) ahead of the close event.
   */
  const postOnly: string[] = [];
  /**
   * POSTs not yet settled, as promises that never reject; the close event
   * must not overtake them. A failed POST keeps its events: a queue body goes
   * back into the buffer (postData re-queues it), a large event into postOnly.
   */
  const uploads = new Set<Promise<void>>();
  const upload = (body: ArrayQueue<string> | string) => {
    const request = postData(postUrl, publicApiKey, body).catch(
      (error: unknown) => {
        if (typeof body === 'string') postOnly.push(body);
        throw error;
      },
    );
    const settled = request.then(
      () => undefined,
      () => undefined,
    );
    uploads.add(settled);
    void settled.then(() => uploads.delete(settled));
    return request;
  };
  const uploadPostOnly = () => {
    postOnly.splice(0).forEach((eventStr) => {
      void upload(eventStr).catch((error) => {
        console.error('Error POSTing a large event:', error);
      });
    });
  };

  const initialPayload: nameValues = { ...meta };

  const urls = recordingUrls(
    options.serverUrl ?? defaultServerUrl,
    recordingId,
  );
  const serverUrl = urls.socketUrl;
  const postUrl = urls.postUrl;
  if (urls.idInQuery) {
    // also include in the payload in case query string gets lost during upgrade or proxying
    initialPayload.recordingId = recordingId;
  }

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
      uploadPostOnly();
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
      const streaming = ws?.readyState === SOCKET_OPEN && paused === 'no';
      if (!streaming && buffer.length()) {
        void upload(buffer).catch((error) => {
          console.error('Error POSTing buffered events:', error);
        });
      }
      uploadPostOnly(); // these never go over the socket
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
        postOnly.length = 0;
        return { delivered: true }; // no recording, so nothing to deliver
      }
      // ws is undefined after disconnect(); the buffer still goes out below.
      const socket = ws;
      ws = undefined;
      paused = 'no';
      if (!permanent) {
        buffer.clear();
        postOnly.length = 0;
      }
      if (
        socket?.readyState === SOCKET_OPEN &&
        !buffer.length() &&
        !postOnly.length &&
        !uploads.size
      ) {
        socket.send(closeStr);
        socket.close();
        return { delivered: true };
      }
      // No open socket to carry the close event, events still buffered
      // (socket connecting, or paused for the POST fallback), or a POST in
      // flight: deliver everything in order, then the close event.
      socket?.close();
      await Promise.all([...uploads]); // each already settled to undefined
      // What the socket did not carry, then large events, then the close.
      const final = new ArrayQueue<string>();
      [...drain(buffer), ...postOnly.splice(0), closeStr].forEach((eventStr) =>
        final.add(eventStr),
      );
      try {
        await postData(postUrl, publicApiKey, final);
        return { delivered: true };
      } catch (error) {
        console.error('Error POSTing final events:', error);
        return {
          delivered: false,
          error: asError(error),
          unsent: drain(final),
        };
      }
    },
  };
}

/**
 * POST serialized events (for example `unsent` from a failed stop()) to the
 * recording, in order. Resolves like stop(): never rejects.
 */
export async function postEvents(
  options: Pick<TransportOptions, 'publicApiKey' | 'recordingId' | 'serverUrl'>,
  events: string[],
): Promise<DeliveryResult> {
  const { postUrl } = recordingUrls(
    options.serverUrl ?? defaultServerUrl,
    options.recordingId,
  );
  const queue = new ArrayQueue<string>();
  events.forEach((eventStr) => queue.add(eventStr));
  try {
    await postData(postUrl, options.publicApiKey, queue);
    return { delivered: true };
  } catch (error) {
    return { delivered: false, error: asError(error), unsent: drain(queue) };
  }
}

/** The socket URL and POST URL for a recording, from a `serverUrl` template. */
function recordingUrls(template: string, recordingId: string) {
  // the expected replacement of recording id
  let socketUrl = template.replace('{recordingId}', recordingId);
  socketUrl = socketUrl.replace('%7BrecordingId%7D', recordingId); // as mangled by `new URL`
  const sURL = new URL(socketUrl);
  const idInQuery = !socketUrl.includes(recordingId);
  if (idInQuery) {
    // '{recordingId}' wasn't in the url;
    // pass as a query string param instead
    sURL.searchParams.set('recordingId', recordingId);
    socketUrl = sURL.href;
  }
  if (sURL.pathname.endsWith('/ws')) {
    sURL.pathname = sURL.pathname.slice(0, -3);
  }
  return { socketUrl, postUrl: sURL.href, idInQuery };
}

function drain(queue: ArrayQueue<string>): string[] {
  const out: string[] = [];
  for (let s = queue.read(); s !== undefined; s = queue.read()) out.push(s);
  return out;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
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
    // re-queue events in case we can reconnect next time or with ws
    const requeue = () => {
      if (!(buffer instanceof ArrayQueue)) return;
      const rest = drain(buffer);
      [...toSend, ...rest].forEach((eventStr) => buffer.add(eventStr));
    };
    let response: Response;
    try {
      // eslint-disable-next-line compat/compat -- fetch is the runtime transport for POST fallback in supported browsers.
      response = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-ndjson',
          Authorization: `Bearer ${publicApiKey}`,
        },
        body,
        keepalive: body.length < keepaliveLimit, // don't abort POST after end of session (must be under the limit)
      });
    } catch (error) {
      requeue(); // the server never saw these events
      throw error;
    }
    responses.push(response);
    if (!response.ok) {
      requeue();
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
