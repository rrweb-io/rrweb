import { record } from '@rrweb/record';
import { getRecordSequentialIdPlugin } from '@rrweb/rrweb-plugin-sequential-id-record';

import { EventType } from '@rrweb/types';
import type { customEvent, eventWithTime, listenerHandler } from '@rrweb/types';
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
  autostart: boolean;
  includePii: boolean;
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

type eventWithSequenceId = eventWithTime & {
  sequenceId?: unknown;
};

type SequenceState = {
  recordingId: string;
  sequenceId: number;
};

const defaultServerUrl =
  'https://api.rrweb.com/recordings/{recordingId}/events/ws';
let defaultClientConfig: clientConfig = {
  serverUrl: defaultServerUrl,
  publicApiKey: '',
  autostart: false,
  includePii: false,
};
const sessionStorageName = 'rrweb-browser-client-recording-id';
const sequenceStoragePrefix = 'rrweb-browser-client-sequence-id:';
const browserClientStartTokenName = '__rrweb_browser_client_start_token__';
const wsLimit = 10e5; // this is approximate and depends on the browser, also on how unicode is encoded (we are comparing against the length of a javascript string)
let sequenceState: SequenceState | undefined;

let ws: Websocket | undefined;
let wsConnectionPaused = false;

const buffer: ArrayQueue<string> = new ArrayQueue();
let rrwebStopFn: listenerHandler | undefined;

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
  if (resetRecordingId) {
    invalidateActiveStart();
  }
  // reset all state so that start() can start afresh
  if (rrwebStopFn !== undefined) {
    rrwebStopFn();
    rrwebStopFn = undefined;
  }
  if (ws) {
    const recordingId = getCurrentRecordingId();
    const activeSequenceState = recordingId
      ? getSequenceState(recordingId)
      : undefined;
    const closeEvent: customEventWithTime = {
      timestamp: nowTimestamp(),
      type: EventType.Custom,
      data: {
        tag: 'close-' + (resetRecordingId ? 'permanent' : 'temporary'),
        payload: {},
      },
    };
    // Clear old events before send, so websocket-ts can buffer the close event
    // for the HTTP fallback when the socket is not currently open.
    buffer.clear();
    ws.send(
      JSON.stringify(
        activeSequenceState
          ? ensureSequenceId(closeEvent, activeSequenceState)
          : closeEvent,
      ),
    );
    ws.close();
    wsConnectionPaused = false;
    ws = undefined; // so `emit` can restart it again if page is unfrozen
  } else {
    buffer.clear();
  }
  if (resetRecordingId) {
    const recordingId = getCurrentRecordingId();
    if (recordingId) {
      removeSequenceId(recordingId);
    }
    removeRecordingId();
  }
}

function removeRecordingId(): void {
  sessionStorage.removeItem(sessionStorageName);
}

function invalidateActiveStart(): void {
  delete (window as unknown as Record<string, unknown>)[
    browserClientStartTokenName
  ];
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

function sequenceStorageName(recordingId: string): string {
  return `${sequenceStoragePrefix}${recordingId}`;
}

function isValidSequenceId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function readSequenceId(recordingId: string): number {
  try {
    const value = Number(
      sessionStorage.getItem(sequenceStorageName(recordingId)),
    );
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function persistSequenceId(state: SequenceState): void {
  try {
    sessionStorage.setItem(
      sequenceStorageName(state.recordingId),
      String(state.sequenceId),
    );
  } catch {
    // Best-effort only; keep in-memory sequencing for this page.
  }
}

function getCurrentRecordingId(): string | null {
  try {
    return sessionStorage.getItem(sessionStorageName);
  } catch {
    return null;
  }
}

function getSequenceState(recordingId: string): SequenceState {
  if (sequenceState?.recordingId === recordingId) {
    return sequenceState;
  }
  sequenceState = {
    recordingId,
    sequenceId: readSequenceId(recordingId),
  };
  return sequenceState;
}

function removeSequenceId(recordingId: string): void {
  try {
    sessionStorage.removeItem(sequenceStorageName(recordingId));
  } catch {
    // Best-effort cleanup only.
  }
  if (sequenceState?.recordingId === recordingId) {
    sequenceState = undefined;
  }
}

function ensureSequenceId(
  event: eventWithTime,
  state: SequenceState,
): eventWithTime & { sequenceId: number } {
  const eventWithSequence = event as eventWithSequenceId;
  if (
    isValidSequenceId(eventWithSequence.sequenceId) &&
    eventWithSequence.sequenceId > state.sequenceId
  ) {
    state.sequenceId = eventWithSequence.sequenceId;
    persistSequenceId(state);
    return eventWithSequence as eventWithTime & { sequenceId: number };
  }
  state.sequenceId += 1;
  eventWithSequence.sequenceId = state.sequenceId;
  persistSequenceId(state);
  return eventWithSequence as eventWithTime & { sequenceId: number };
}

function getSetSequenceState(): SequenceState | undefined {
  const recordingId = getSetRecordingId();
  return recordingId ? getSequenceState(recordingId) : undefined;
}

function buildRecordOptionsWithSequencePlugin(
  recordOptions: Omit<browserClientRecordOptions, keyof clientConfig>,
  state: SequenceState,
): Omit<browserClientRecordOptions, keyof clientConfig> {
  return {
    ...recordOptions,
    plugins: [
      ...(recordOptions.plugins || []),
      getRecordSequentialIdPlugin({
        key: 'sequenceId',
        startId: state.sequenceId,
        preserveExisting: true,
      }),
    ],
  };
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

  const fallbackPosting = setInterval(() => {
    if (buffer.length()) {
      void postData(postUrl, publicApiKey, buffer).catch((error) => {
        clearInterval(fallbackPosting);
        console.error('Error periodically POSTing events:', error);
      });
    }
  }, 5 * 1000);

  // Add event listeners
  ws.addEventListener(WebsocketEvent.open, () => {
    clearInterval(fallbackPosting);
  });
  ws.addEventListener(WebsocketEvent.message, messageHandler);
  return ws;
}

async function postData(
  postUrl: string,
  publicApiKey: string,
  buffer: ArrayQueue<string> | string,
) {
  const keepaliveLimit = 65000;
  let done = false;
  const responses: Response[] = [];
  const toSend: string[] = [];
  do {
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
        toSend.forEach((eventStr) => buffer.add(eventStr));
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

export function start(
  options: browserClientRecordOptions = defaultClientConfig,
) {
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
      wsConnectionPaused = true;
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
  const activeSequenceState = getSequenceState(recordingId);
  const startToken = Symbol('rrweb-browser-client-start');
  const windowState = window as unknown as Record<string, unknown>;
  windowState[browserClientStartTokenName] = startToken;

  const isActiveStart = () =>
    windowState[browserClientStartTokenName] === startToken;

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
  buffer.add(JSON.stringify(ensureSequenceId(metaEvent, activeSequenceState)));

  recordOptions.emit = (event: eventWithTime) => {
    const sequencedEvent = ensureSequenceId(event, activeSequenceState);
    if (!ws) {
      // don't make a connection until rrweb starts (looks at document.readyState and waits for DOMContentLoaded or load)
      ws = connect(serverUrl, postUrl, publicApiKey, handleMessage);

      ws.addEventListener(WebsocketEvent.close, () => {
        // fallback to postData while backoff algorithm is in effect
        wsConnectionPaused = true;
      });
    }
    if (configEmit !== undefined) {
      if (typeof configEmit === 'function') {
        configEmit(sequencedEvent);
      } else if (
        typeof (window as unknown as Record<string, unknown>)[configEmit] ===
        'function'
      ) {
        const emit = (window as unknown as Record<string, unknown>)[
          configEmit
        ] as (event: eventWithTime) => void;
        emit(sequencedEvent);
      } else {
        console.error('Could not understand emit config option:', configEmit);
      }
    }
    if (sequencedEvent.type === EventType.Meta && includePii) {
      const metaData = sequencedEvent.data as typeof sequencedEvent.data & {
        title?: string;
        referrer?: string;
      };
      metaData.title = document.title.substring(0, 500); // already recorded in rrweb as part of the <title> element
      metaData.referrer = document.referrer; // could potentially contain PII
    }

    const eventStr = JSON.stringify(sequencedEvent);
    // TODO: add browser native compression
    if (eventStr.length > wsLimit) {
      // Assuming wsLimit is a defined constant, and eventStr.length is intended.
      void postData(postUrl, publicApiKey, eventStr);
    } else if (ws && !wsConnectionPaused) {
      ws.send(eventStr);
    } else {
      buffer.add(eventStr);
    }
  };

  const startRecording = () => {
    rrwebStopFn = record(
      buildRecordOptionsWithSequencePlugin(
        recordOptions,
        activeSequenceState,
      ) as recordOptions<eventWithTime>,
    );
  };

  let startWhenVisible = false;
  if (!document.hidden) {
    startRecording();
  } else {
    startWhenVisible = true;
  }
  if (typeof document.hidden !== 'undefined') {
    document.addEventListener(
      'visibilitychange',
      () => {
        if (!isActiveStart()) return;
        if (!document.hidden && startWhenVisible) {
          startRecording();
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
            if ((!ws || wsConnectionPaused) && buffer.length()) {
              void postData(postUrl, publicApiKey, buffer);
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
    if (!isActiveStart()) return;
    // https://developer.chrome.com/docs/web-platform/page-lifecycle-api
    // "In particular, it's important that you ... close any open Web Socket connections
    if (ws) {
      ws.close();
      wsConnectionPaused = false;
      ws = undefined; // so `emit` can restart it again if page is unfrozen
    }
    if (rrwebStopFn !== undefined) {
      rrwebStopFn();
      rrwebStopFn = undefined;
      startWhenVisible = true;
    }
  });
}

export const addCustomEvent = <T>(tag: string, payload: T) => {
  if (rrwebStopFn !== undefined) {
    record.addCustomEvent(tag, payload);
  } else {
    const customEvent: customEventWithTime = {
      timestamp: nowTimestamp(),
      type: EventType.Custom,
      data: {
        tag,
        payload,
      },
    };
    // let websocket buffer handle it
    const state = getSetSequenceState();
    buffer.add(
      JSON.stringify(
        state ? ensureSequenceId(customEvent, state) : customEvent,
      ),
    );
  }
};

export function addMeta(payload: nameValues) {
  addCustomEvent('recording-meta', payload);
}

export function addPageviewMeta(payload: nameValues) {
  // could alter timestamp to match Meta/FullSnapshot event
  addCustomEvent('pageview-meta', payload);
}

if (document && document.currentScript) {
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
  getRecordingId,
};
