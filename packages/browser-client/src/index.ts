import { record } from '@rrweb/record';

import { EventType } from '@rrweb/types';
import type {
  annotationData,
  annotationEvent,
  customEvent,
  eventWithTime,
  listenerHandler,
} from '@rrweb/types';
import { nowTimestamp } from '@rrweb/utils';
import type { recordOptions } from 'rrweb';

import {
  ArrayQueue,
  ExponentialBackoff,
  Websocket,
  WebsocketBuilder,
  WebsocketEvent,
} from 'websocket-ts';

declare const __RRWEB_BROWSER_CLIENT_VERSION__: string;
declare const __RRWEB_BROWSER_CLIENT_COMMIT_HASH__: string;

export type clientConfig = {
  serverUrl?: string;
  publicApiKey: string;
  autostart?: boolean;
  includePii?: boolean;
  jsSource?: string;
  jsEntrypoint?: string;
  meta?: nameValues;
};

export type nameValues = Record<string, string | boolean | number>;

export type browserClientRecordOptions = Omit<
  recordOptions<eventWithTime>,
  'emit'
> &
  clientConfig & {
    emit?: recordOptions<eventWithTime>['emit'] | string;
  };

type websocketListenerHandler = (i: Websocket, ev: MessageEvent) => void;
type ServerMessage =
  | { type: 'error' }
  | { type: 'upstream-result'; ok?: boolean }
  | { type?: unknown; ok?: unknown };

export type customEventWithTime = customEvent & {
  timestamp: number;
};

type ClientEvent = customEvent | annotationEvent;

const defaultServerUrl =
  'https://api.rrweb.com/recordings/{recordingId}/events/ws';
let defaultClientConfig: clientConfig = {
  serverUrl: defaultServerUrl,
  publicApiKey: '',
  autostart: false,
  includePii: false,
};
const sessionStorageName = 'rrweb-browser-client-recording-id';
const wsLimit = 10e5; // this is approximate and depends on the browser, also on how unicode is encoded (we are comparing against the length of a javascript string)

const wsReadyStateOpen = 1; // WebSocket.OPEN
const fallbackPostDelay = 5 * 1000;
const fallbackPostMaxDelay = 60 * 1000;
// How long a buffer POST may hold back live sending.
const fallbackPostTimeout = 30 * 1000;
const errorBodyTimeout = 2 * 1000;

let ws: Websocket | undefined;
// The socket dropped; the library is reconnecting. Cleared when it reopens.
let wsDisconnected = false;
// The server reported an error on this socket. Stays set until the socket is
// replaced, so later events go through the POST fallback instead.
let wsRejected = false;
let cancelFallbackPosting: (() => void) | undefined;
let postTarget: { postUrl: string; publicApiKey: string } | undefined;
// A fallback POST of the buffer is in flight. Until it settles, new events are
// buffered behind it so they can't overtake the events it took.
let fallbackPostInFlight = false;
// Events the socket would have flushed when it reopened during that POST.
let heldDuringPost: string[] = [];
// Bumped by stop(), so a POST started for one recording never puts events
// back into, or takes events from, the buffer of the next one.
let recordingEpoch = 0;

function wsConnectionPaused(): boolean {
  return wsDisconnected || wsRejected || fallbackPostInFlight;
}

function resetConnectionState() {
  cancelFallbackPosting?.();
  cancelFallbackPosting = undefined;
  wsDisconnected = false;
  wsRejected = false;
}

const buffer: ArrayQueue<string> = new ArrayQueue();

// put events taken for a failed POST back in front of anything added since
function requeue(buffer: ArrayQueue<string>, taken: string[]) {
  const rest: string[] = [];
  for (
    let eventStr = buffer.read();
    eventStr !== undefined;
    eventStr = buffer.read()
  ) {
    rest.push(eventStr);
  }
  [...taken, ...heldDuringPost, ...rest].forEach((eventStr) =>
    buffer.add(eventStr),
  );
  heldDuringPost = [];
}

function sendBufferOverSocket() {
  if (!ws || ws.readyState !== wsReadyStateOpen || wsConnectionPaused()) {
    return;
  }
  for (
    let eventStr = buffer.read();
    eventStr !== undefined;
    eventStr = buffer.read()
  ) {
    ws.send(eventStr);
  }
}

// POST the buffer, one request at a time. Rejects when the POST failed (the
// events are back in the buffer by then) or is taking too long.
function postBufferedEvents(): Promise<void> {
  if (fallbackPostInFlight || !postTarget || !buffer.length()) {
    return Promise.resolve();
  }
  const epoch = recordingEpoch;
  const isCurrent = () => epoch === recordingEpoch;
  fallbackPostInFlight = true;
  let released = false;
  // let live sending continue; the socket may have reopened meanwhile and
  // nothing else would send what was buffered or held behind the POST
  const release = () => {
    if (!isCurrent()) return;
    if (!released) {
      released = true;
      fallbackPostInFlight = false;
    }
    requeue(buffer, []);
    sendBufferOverSocket();
  };
  const post = postData(
    postTarget.postUrl,
    postTarget.publicApiKey,
    buffer,
    isCurrent,
  );
  return new Promise<void>((resolve, reject) => {
    // A slow upload is never cancelled, as it may still succeed. It just
    // stops holding back newer events; if it fails later they are requeued.
    const timer = setTimeout(() => {
      release();
      reject(new Error('Fallback POST is taking too long'));
    }, fallbackPostTimeout);
    post
      .then(
        () => resolve(),
        (error) => reject(error),
      )
      .finally(() => {
        clearTimeout(timer);
        release();
      });
  });
}
let rrwebStopFn: listenerHandler | undefined;
let recorderReady = false;
const pendingEvents: (ClientEvent & { timestamp: number })[] = [];
let cancelRecordingStartListener: listenerHandler | undefined;

function resetRecordingState() {
  recorderReady = false;
  cancelRecordingStartListener?.();
  cancelRecordingStartListener = undefined;
}

function hasDocument(): boolean {
  return typeof document !== 'undefined';
}

function isServerMessage(value: unknown): value is ServerMessage {
  return typeof value === 'object' && value !== null;
}

function sanitizeScriptSource(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return value;
  }
}

function scriptSourceFromElement(
  script: HTMLScriptElement,
): string | undefined {
  return sanitizeScriptSource(script.src);
}

export function stop(resetRecordingId: boolean) {
  // reset all state so that start() can start afresh
  resetRecordingState();
  pendingEvents.length = 0;
  if (rrwebStopFn !== undefined) {
    rrwebStopFn();
    rrwebStopFn = undefined;
  }
  if (ws) {
    const closeEvent: customEventWithTime = {
      timestamp: nowTimestamp(),
      type: EventType.Custom,
      data: {
        tag: 'close-' + (resetRecordingId ? 'permanent' : 'temporary'),
        payload: {},
      },
    };
    if (
      fallbackPostInFlight &&
      ws.readyState === wsReadyStateOpen &&
      !wsDisconnected &&
      !wsRejected
    ) {
      // These were only waiting behind a pending POST; without it they would
      // already have gone out over this socket.
      const withheld = heldDuringPost;
      for (
        let eventStr = buffer.read();
        eventStr !== undefined;
        eventStr = buffer.read()
      ) {
        withheld.push(eventStr);
      }
      withheld.forEach((eventStr) => ws?.send(eventStr));
    }
    // Clear old events before send, so websocket-ts can buffer the close event
    // for the HTTP fallback when the socket is not currently open.
    buffer.clear();
    ws.send(JSON.stringify(closeEvent));
    ws.close();
    if (buffer.length() && postTarget) {
      // The socket wasn't open, so the close event is still in the buffer.
      // POST it as a plain string: a failure must not put it back, or it
      // would be sent under the next recording.
      const unsent: string[] = [];
      for (
        let eventStr = buffer.read();
        eventStr !== undefined;
        eventStr = buffer.read()
      ) {
        unsent.push(eventStr);
      }
      void postData(
        postTarget.postUrl,
        postTarget.publicApiKey,
        unsent.join('\n'),
      ).catch((error) => {
        console.error('Error POSTing close event:', error);
      });
    }
    resetConnectionState();
    ws = undefined; // so `emit` can restart it again if page is unfrozen
  } else {
    buffer.clear();
  }
  // Also when a freeze already dropped the socket: a POST still in flight
  // must lose its claim on the buffer before another recording starts.
  recordingEpoch++;
  fallbackPostInFlight = false;
  heldDuringPost = [];
  if (resetRecordingId) {
    removeRecordingId();
  }
}

function removeRecordingId(): void {
  try {
    sessionStorage.removeItem(sessionStorageName);
  } catch {
    // Ignore environments without sessionStorage, such as SSR.
  }
}

function getSetVisitorId() {
  const nameEQ = 'rrweb-browser-client-visitor-id=';
  let value: string | null = null;
  if (document.cookie) {
    document.cookie.split(';').forEach((cp) => {
      if (cp.trim().startsWith(nameEQ)) {
        value = cp.trim();
        // we could `break` (if not in a forEach) as we're not setting multiple cookies against different subdomains/paths
      }
    });
  }
  if (!value) {
    // eslint-disable-next-line compat/compat -- @rrweb/browser-client targets modern browsers with crypto UUID support for recording/session identity.
    value = self.crypto.randomUUID();
    const date = new Date();
    date.setTime(date.getTime() + 366 * 86400000); // 1 year
    const expires = 'expires=' + date.toUTCString();

    // SameSite=Lax to cross subdomains
    const secure = window.location.protocol === 'https:' ? ';Secure' : '';
    const domain = `;domain=${document.location.host.replace(/^www\./, '')}`;
    document.cookie = `${nameEQ}${value};${expires}${domain};path=/;SameSite=Lax${secure}`;
  }
  return value;
}

function getSetRecordingId(): string | null {
  let value: string | null = null;
  try {
    value = sessionStorage.getItem(sessionStorageName);
    if (!value) {
      // eslint-disable-next-line compat/compat -- @rrweb/browser-client targets modern browsers with crypto UUID support for recording/session identity.
      value = self.crypto.randomUUID();
      try {
        sessionStorage.setItem(sessionStorageName, value);
      } catch (e) {
        value = null;
      }
    }
  } catch (e) {
    value = null;
  }
  return value;
}

// if API client requests the recording ID prior to start,
// set it immediately so that it will be the eventual id used
export const getRecordingId = getSetRecordingId;

function connect(
  serverUrl: string,
  postUrl: string,
  publicApiKey: string,
  messageHandler: websocketListenerHandler,
): Websocket {
  const wsUrl = new URL(serverUrl);
  if (publicApiKey) {
    wsUrl.searchParams.set('token', publicApiKey);
  }
  wsUrl.protocol = wsUrl.protocol.replace('http', 'ws'); // testing/puppeteer: SyntaxError: Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. 'https' is not allowed.

  const ws = new WebsocketBuilder(wsUrl.href)
    .withBuffer(buffer) // when disconnected
    .withBackoff(
      new ExponentialBackoff(500 + Math.round(1000 * Math.random()), 6),
    ) // retry around every 1s, 2s, 4s, 8s, maxing out with a retry every ~1minute
    .build();

  // POST buffered events whenever the socket can't take them: before it first
  // opens, while it is reconnecting, and after the server rejected it.
  postTarget = { postUrl, publicApiKey };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  let delay = fallbackPostDelay;
  const schedule = () => {
    timer = setTimeout(() => {
      const socketUsable =
        ws.readyState === wsReadyStateOpen && !wsConnectionPaused();
      if (socketUsable || fallbackPostInFlight || !buffer.length()) {
        schedule();
        return;
      }
      postBufferedEvents()
        .then(() => {
          delay = fallbackPostDelay;
        })
        .catch((error) => {
          // events were put back in the buffer; retry less often
          delay = Math.min(delay * 2, fallbackPostMaxDelay);
          console.error('Error periodically POSTing events:', error);
        })
        .finally(() => {
          if (!cancelled) schedule();
        });
    }, delay);
  };
  schedule();
  cancelFallbackPosting?.();
  cancelFallbackPosting = () => {
    cancelled = true;
    clearTimeout(timer);
  };

  // Add event listeners
  ws.addEventListener(WebsocketEvent.close, () => {
    wsDisconnected = true;
  });
  ws.addEventListener(WebsocketEvent.open, () => {
    // websocket-ts sends the buffer right after this; resume live sending
    wsDisconnected = false;
    if (fallbackPostInFlight) {
      // keep these behind the events being POSTed; sent once it settles
      for (
        let eventStr = buffer.read();
        eventStr !== undefined;
        eventStr = buffer.read()
      ) {
        heldDuringPost.push(eventStr);
      }
    }
  });
  ws.addEventListener(WebsocketEvent.message, messageHandler);
  return ws;
}

async function postData(
  postUrl: string,
  publicApiKey: string,
  buffer: ArrayQueue<string> | string,
  // false once the recording this POST belongs to was stopped
  ownsBuffer: () => boolean = () => true,
) {
  const keepaliveLimit = 65000;
  let done = false;
  const responses: Response[] = [];
  do {
    const toSend: string[] = [];
    let body;
    if (buffer instanceof ArrayQueue) {
      if (!ownsBuffer()) {
        break; // the buffer now belongs to another recording
      }
      if (heldDuringPost.length) {
        requeue(buffer, []); // keep held events ahead of newer ones
      }
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
      // offline, DNS, CORS, aborted: nothing reached the server
      if (buffer instanceof ArrayQueue && ownsBuffer()) {
        requeue(buffer, toSend);
      }
      throw error;
    }
    responses.push(response);
    if (!response.ok) {
      if (buffer instanceof ArrayQueue && ownsBuffer()) {
        // re-queue events in case we can reconnect next time or with ws
        requeue(buffer, toSend);
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
      // diagnostic only: don't let a slow or malformed body hold up sending
      let bodyTimer: ReturnType<typeof setTimeout> | undefined;
      const responseBody = await Promise.race([
        badResponse.text().catch(() => ''),
        new Promise<string>((resolve) => {
          bodyTimer = setTimeout(() => resolve(''), errorBodyTimeout);
        }),
      ]);
      clearTimeout(bodyTimer);
      if (responseBody) {
        badResponseInfo += '\nresponse body:' + responseBody;
      }
    }
    throw new Error(`Bad response from POST: ${badResponseInfo}`);
  }
  return responses;
}

export function start(
  options: browserClientRecordOptions = defaultClientConfig,
) {
  if (!hasDocument()) {
    return;
  }

  const {
    includePii,
    publicApiKey,
    jsSource: rawJsSource,
    jsEntrypoint,
    ...recordOptions
  } = options;
  let { serverUrl = defaultServerUrl } = options;

  if (recordOptions.slimDOMOptions === undefined) {
    recordOptions.slimDOMOptions = 'all';
  }
  if (recordOptions.maskAllInputs === undefined) {
    recordOptions.maskAllInputs = true; // default to more privacy
  }
  // TODO: switch this back to captureAssets.stylesheets once rrweb pulls in
  // the captureAssets recording API from the assets branch.
  if (recordOptions.inlineStylesheet === undefined) {
    recordOptions.inlineStylesheet = true;
  }

  const configEmit = recordOptions.emit;

  const handleMessage = (_: Websocket, ev: MessageEvent) => {
    const parsedEvent: unknown = JSON.parse(String(ev.data));
    if (
      isServerMessage(parsedEvent) &&
      (parsedEvent.type === 'error' ||
        (parsedEvent.type === 'upstream-result' && !parsedEvent.ok))
    ) {
      console.warn('received error, pausing websockets:', parsedEvent);
      wsRejected = true;
    } else {
      console.log(`received message: ${String(ev.data)}`);
    }
  };

  const recordingId = getSetRecordingId();
  if (!recordingId) {
    // TODO: we could allow client to supply their own recordingId
    // however that would have implications on how we can handle
    // recordings server side (that a recording could mix events from
    // multiple browsing contexts)
    console.error(
      '@rrweb/browser-client: Unable to start(); sessionStorage unavailable',
    );
    return;
  }

  const initialPayload: nameValues = {
    domain: document.location.hostname || document.location.href.split('?')[0], // latter is for debugging (e.g. a file:// url)
    includePii: Boolean(includePii), // tell server not to store IP addresses or user agents
  };

  // the expected replacement of recording id
  serverUrl = serverUrl.replace('{recordingId}', recordingId);
  serverUrl = serverUrl.replace('%7BrecordingId%7D', recordingId); // as mangled by `new URL`

  const sURL = new URL(serverUrl);
  if (!serverUrl.includes(recordingId)) {
    // '{recordingId}' wasn't in the url;
    // pass as a query string param instead
    sURL.searchParams.set('recordingId', recordingId);
    serverUrl = sURL.href;
    // also include in initialPayload in case query string gets lost during upgrade or proxying
    initialPayload.recordingId = recordingId;
  }
  if (sURL.pathname.endsWith('/ws')) {
    sURL.pathname = sURL.pathname.slice(0, -3);
  }
  const postUrl = sURL.href;

  if (includePii) {
    initialPayload.visitor = getSetVisitorId();
    try {
      initialPayload.timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      initialPayload.timezone = 'unknown';
    }
    try {
      if (navigator.languages !== undefined) {
        initialPayload.language = navigator.languages[0];
      } else {
        initialPayload.language = navigator.language;
      }
    } catch (e) {
      initialPayload.language = 'unknown';
    }
    // initialPayload.userAgent = navigator.userAgent;  // we should be able to get this server side
    // the following is different to EventType.Meta width/height
    // which is used in replay; it's more about what size screen
    // the visitor has for analytics
    initialPayload.screenWidth = screen.width;
    initialPayload.screenHeight = screen.height;
    initialPayload.devicePixelRatio = window.devicePixelRatio;
  }
  if (options.meta) {
    Object.assign(initialPayload, options.meta);
  }
  initialPayload.recordVersion = __RRWEB_BROWSER_CLIENT_VERSION__;
  initialPayload.recordCommitHash = __RRWEB_BROWSER_CLIENT_COMMIT_HASH__;
  initialPayload.jsEntrypoint = jsEntrypoint ?? 'programmatic';

  const jsSource = sanitizeScriptSource(rawJsSource);
  if (jsSource) {
    initialPayload.jsSource = jsSource;
  }

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

  const emitEvent = (event: eventWithTime) => {
    if (!ws) {
      // don't make a connection until rrweb starts (looks at document.readyState and waits for DOMContentLoaded or load)
      ws = connect(serverUrl, postUrl, publicApiKey, handleMessage);
    }
    if (configEmit !== undefined) {
      if (typeof configEmit === 'function') {
        configEmit(event);
      } else if (
        typeof (window as unknown as Record<string, unknown>)[configEmit] ===
        'function'
      ) {
        const emit = (window as unknown as Record<string, unknown>)[
          configEmit
        ] as (event: eventWithTime) => void;
        emit(event);
      } else {
        console.error('Could not understand emit config option:', configEmit);
      }
    }
    if (event.type === EventType.Meta && includePii) {
      const metaData = event.data as typeof event.data & {
        title?: string;
        referrer?: string;
      };
      metaData.title = document.title.substring(0, 500); // already recorded in rrweb as part of the <title> element
      metaData.referrer = document.referrer; // could potentially contain PII
    }

    const eventStr = JSON.stringify(event);
    // TODO: add browser native compression
    if (eventStr.length > wsLimit) {
      // Assuming wsLimit is a defined constant, and eventStr.length is intended.
      void postData(postUrl, publicApiKey, eventStr).catch((error) => {
        console.error('Error POSTing oversized event:', error);
      });
    } else if (ws && !wsConnectionPaused()) {
      ws.send(eventStr);
    } else {
      buffer.add(eventStr);
    }
  };

  recordOptions.emit = emitEvent;

  const markRecorderReady = () => {
    recorderReady = true;
    cancelRecordingStartListener = undefined;
    // Preserve call-time timestamps and use the same callback and transport as
    // recorder events. Remove each event before emitting to avoid redelivery.
    while (recorderReady && pendingEvents.length) {
      const event = pendingEvents.shift();
      if (event) emitEvent(event);
    }
  };

  const startRrwebRecording = () => {
    resetRecordingState();
    const startsImmediately =
      document.readyState === 'interactive' ||
      document.readyState === 'complete';
    rrwebStopFn = record(recordOptions as recordOptions<eventWithTime>);
    if (rrwebStopFn === undefined) {
      return;
    }
    if (startsImmediately) {
      markRecorderReady();
      return;
    }

    const startEvent =
      recordOptions.recordAfter === 'DOMContentLoaded'
        ? { target: document, type: 'DOMContentLoaded' }
        : { target: window, type: 'load' };
    const listenerOptions = { capture: true, once: true };
    // rrweb installs its capture listener during record(). Registering after it
    // waits for rrweb's initializer to set its internal recording flag.
    startEvent.target.addEventListener(
      startEvent.type,
      markRecorderReady,
      listenerOptions,
    );
    cancelRecordingStartListener = () =>
      startEvent.target.removeEventListener(
        startEvent.type,
        markRecorderReady,
        listenerOptions,
      );
  };

  let startWhenVisible = false;
  if (!document.hidden) {
    startRrwebRecording();
  } else {
    startWhenVisible = true;
  }
  if (typeof document.hidden !== 'undefined') {
    document.addEventListener(
      'visibilitychange',
      () => {
        if (!document.hidden && startWhenVisible) {
          startRrwebRecording();
          startWhenVisible = false;
          return;
        }
        try {
          // either of 'page-hidden' or 'page-visible'
          record.addCustomEvent('page-' + document.visibilityState, {});
          if (document.hidden) {
            /*
            - a user navigates to a new page
            - switches tabs
            - closes the tab
            - minimizes or closes the browser
            - switches from the browser to a different app
          */
            // don't record background animations etc. while page isn't visible
            record.freezePage();

            // document.hidden is better than beforeunload, see:
            // https://developer.chrome.com/docs/web-platform/page-lifecycle-api
            if ((!ws || wsConnectionPaused()) && buffer.length()) {
              void postBufferedEvents().catch((error) => {
                console.error('Error POSTing events on page hide:', error);
              });
            }
          }
        } catch (e) {
          // ignore, recording may not be active yet
        }
      },
      false,
    );
  }
  document.addEventListener('freeze', () => {
    // https://developer.chrome.com/docs/web-platform/page-lifecycle-api
    // "In particular, it's important that you ... close any open Web Socket connections
    if (ws) {
      ws.close();
      resetConnectionState();
      ws = undefined; // so `emit` can restart it again if page is unfrozen
    }
    if (rrwebStopFn !== undefined) {
      resetRecordingState();
      rrwebStopFn();
      startWhenVisible = true;
    }
  });
}

function addClientEvent(event: ClientEvent) {
  if (!recorderReady) {
    const timestamp = nowTimestamp();
    // Snapshot queued data at call time, as the transport buffer did before.
    if (event.type === EventType.Custom) {
      const serialized = JSON.stringify(event.data.payload);
      const payload: unknown =
        serialized === undefined ? undefined : JSON.parse(serialized);
      pendingEvents.push({
        type: event.type,
        timestamp,
        data: { tag: event.data.tag, payload },
      });
    } else {
      pendingEvents.push({
        type: event.type,
        timestamp,
        data: { ...event.data },
      });
    }
    return;
  }
  switch (event.type) {
    case EventType.Custom:
      record.addCustomEvent(event.data.tag, event.data.payload);
      break;
    case EventType.Annotation:
      record.addAnnotation(event.data);
      break;
  }
}

export const addCustomEvent = <T>(tag: string, payload: T) => {
  addClientEvent({ type: EventType.Custom, data: { tag, payload } });
};

export const addAnnotation = (annotation: annotationData) => {
  addClientEvent({ type: EventType.Annotation, data: annotation });
};

export function addMeta(payload: nameValues) {
  addCustomEvent('recording-meta', payload);
}

export function addPageviewMeta(payload: nameValues) {
  // could alter timestamp to match Meta/FullSnapshot event
  addCustomEvent('pageview-meta', payload);
}

if (hasDocument() && document.currentScript) {
  let config = defaultClientConfig;
  const truthyAttr: readonly (string | null)[] = ['', 'yes', 'on', 'true', '1']; // empty string allows setting plain html5 attributes without values
  const self = document.currentScript as HTMLScriptElement;
  if (self.innerText && self.innerText.trim()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- script tag config is an external payload.
      config = JSON.parse(
        self.innerText
          .replace(/^\s*\/\/.*/gm, '') // remove comment lines
          .replace(/,(\s*[\]}])/g, '$1'), // allow trailing commas
      );
    } catch (error) {
      console.error(
        '@rrweb/browser-client: Could not parse script tag config as JSON',
        error,
      );
    }
  }
  config.jsSource ??= scriptSourceFromElement(self);
  config.jsEntrypoint ??= self.dataset.rrwebEntrypoint || 'script-tag';
  if (truthyAttr.includes(self.getAttribute('includepii'))) {
    config.includePii = true;
  }
  if (self.src) {
    try {
      if (config.serverUrl) {
        // transform provided relative URLs into absolute based on where we are served from
        config.serverUrl = new URL(config.serverUrl, self.src).href;
      } else {
        // generate a default server url
        const srcUrl = new URL(self.src);
        if (srcUrl.hostname) {
          let apiHost = srcUrl.hostname;
          if (
            apiHost === 'rrweb.com' ||
            apiHost === 'www.rrweb.com' ||
            apiHost === 'cdn.rrweb.com' ||
            apiHost === 'rrweb.io' ||
            apiHost.endsWith('.rrweb.io')
          ) {
            apiHost = 'api.rrweb.com';
          }
          config.serverUrl = `https://${apiHost}/recordings/{recordingId}/events/ws`;
        }
      }
    } catch {
      // maybe we are in a weird environment, we're likely gonna fail when we next call new URL on serverurl
    }
  }
  // if start later (no autostart), or manually stop and (re)start() later
  defaultClientConfig = config;
  if (config.autostart || truthyAttr.includes(self.getAttribute('autostart'))) {
    start(config);
  }
}

export default {
  start,
  stop,
  addMeta,
  addPageviewMeta,
  addCustomEvent,
  addAnnotation,
  getRecordingId,
};
