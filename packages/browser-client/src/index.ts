import { record } from '@rrweb/record';
import {
  EventBuffer,
  UploadTransport,
  byteLength,
  MAX_BUFFER_BYTES,
} from './transport';

import { EventType } from '@rrweb/types';
import type { customEvent, eventWithTime, listenerHandler } from '@rrweb/types';
import { nowTimestamp } from '@rrweb/utils';
import type { recordOptions } from 'rrweb';

import {
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

let ws: Websocket | undefined;
let wsConnectionPaused = true;
let transport: UploadTransport | undefined;
let removeLifecycleListeners: (() => void) | undefined;

let buffer = new EventBuffer();
let rrwebStopFn: listenerHandler | undefined;

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
  removeLifecycleListeners?.();
  removeLifecycleListeners = undefined;
  // reset all state so that start() can start afresh
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
    buffer.add(JSON.stringify(closeEvent));
    ws.close();
    ws = undefined;
  }
  transport?.dispose();
  transport = undefined;
  buffer = new EventBuffer();
  wsConnectionPaused = true;
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

const globalSocket = () => ws;

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
    .withBackoff(
      new ExponentialBackoff(500 + Math.round(1000 * Math.random()), 6),
    ) // retry around every 1s, 2s, 4s, 8s, maxing out with a retry every ~1minute
    .build();

  // websocket-ts must not drain the HTTP queue on reconnect: its drain
  // could overtake an unresolved older POST batch.
  const connectionBuffer = buffer;
  const connectionTransport =
    transport ??
    new UploadTransport(postUrl, publicApiKey, connectionBuffer, () => {
      if (transport?.buffer === connectionBuffer) globalSocket()?.close();
    });
  transport = connectionTransport;
  connectionTransport.resume();
  const isCurrent = () =>
    transport === connectionTransport && ws === globalSocket();

  ws.addEventListener(WebsocketEvent.open, () => {
    if (!isCurrent()) return;
    wsConnectionPaused = false;
  });
  ws.addEventListener(WebsocketEvent.close, () => {
    if (!isCurrent()) return;
    wsConnectionPaused = true;
  });
  ws.addEventListener(WebsocketEvent.message, (socket, event) => {
    if (isCurrent()) messageHandler(socket, event);
  });
  return ws;
}

export function start(
  options: browserClientRecordOptions = defaultClientConfig,
) {
  if (!hasDocument()) {
    return;
  }

  if (removeLifecycleListeners || rrwebStopFn || ws) stop(false);

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

  recordOptions.emit = (event: eventWithTime) => {
    if (!ws && !buffer.failed) {
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
    if (buffer.failed) return;
    if (
      byteLength(eventStr) <= wsLimit &&
      ws &&
      !wsConnectionPaused &&
      transport?.canSend &&
      ws.bufferedAmount + byteLength(eventStr) <= MAX_BUFFER_BYTES
    ) {
      try {
        ws.send(eventStr);
      } catch {
        wsConnectionPaused = true;
        buffer.add(eventStr);
      }
    } else {
      buffer.add(eventStr);
      if (byteLength(eventStr) > wsLimit) void transport?.flush();
    }
  };

  let startWhenVisible = false;
  if (!document.hidden) {
    rrwebStopFn = record(recordOptions as recordOptions<eventWithTime>);
  } else {
    startWhenVisible = true;
  }
  const onVisibilityChange = () => {
    if (!document.hidden && startWhenVisible) {
      rrwebStopFn = record(recordOptions as recordOptions<eventWithTime>);
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
        if (buffer.length()) {
          void transport?.flush();
        }
      }
    } catch (e) {
      // ignore, recording may not be active yet
    }
  };
  const onFreeze = () => {
    // https://developer.chrome.com/docs/web-platform/page-lifecycle-api
    // "In particular, it's important that you ... close any open Web Socket connections
    if (ws) {
      ws.close();
      transport?.suspend();
      wsConnectionPaused = true;
      ws = undefined; // so `emit` can restart it again if page is unfrozen
    }
    if (rrwebStopFn !== undefined) {
      rrwebStopFn();
      rrwebStopFn = undefined;
      startWhenVisible = true;
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('freeze', onFreeze);
  removeLifecycleListeners = () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('freeze', onFreeze);
  };
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
    buffer.add(JSON.stringify(customEvent));
  }
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
  getRecordingId,
};
