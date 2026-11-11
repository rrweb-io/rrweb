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

import { createTransport, postEvents } from './transport';
import type {
  customEventWithTime,
  DeliveryResult,
  nameValues,
  Transport,
  TransportOptions,
} from './transport';

export { createTransport, postEvents };
export type {
  customEventWithTime,
  DeliveryResult,
  nameValues,
  Transport,
  TransportOptions,
};

export type clientConfig = {
  serverUrl?: string;
  publicApiKey: string;
  autostart?: boolean;
  includePii?: boolean;
  jsSource?: string;
  jsEntrypoint?: string;
  meta?: nameValues;
};

export type browserClientRecordOptions = Omit<
  recordOptions<eventWithTime>,
  'emit'
> &
  clientConfig & {
    emit?: recordOptions<eventWithTime>['emit'] | string;
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

let transport: Transport | undefined;
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
  void transport?.stop(resetRecordingId);
  transport = undefined;
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

export function start(
  options: browserClientRecordOptions = defaultClientConfig,
) {
  if (!hasDocument()) {
    return;
  }

  const {
    includePii,
    publicApiKey,
    serverUrl,
    jsSource: rawJsSource,
    jsEntrypoint,
    ...recordOptions
  } = options;

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

  const recordingId = getSetRecordingId();
  if (!recordingId) {
    // start() always records a single browsing context, so it owns the id.
    // Callers that own the recording supply their own id to createTransport.
    console.error(
      '@rrweb/browser-client: Unable to start(); sessionStorage unavailable',
    );
    return;
  }

  const initialPayload: nameValues = {
    domain: document.location.hostname || document.location.href.split('?')[0], // latter is for debugging (e.g. a file:// url)
    includePii: Boolean(includePii), // tell server not to store IP addresses or user agents
  };

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
  initialPayload.jsEntrypoint = jsEntrypoint ?? 'programmatic';

  const jsSource = sanitizeScriptSource(rawJsSource);
  if (jsSource) {
    initialPayload.jsSource = jsSource;
  }

  // A second start() replaces the transport: close the first one's socket and
  // POST what it still buffered (with no open socket, flush() always POSTs).
  transport?.disconnect();
  transport?.flush();
  transport = createTransport({
    publicApiKey,
    recordingId,
    serverUrl,
    meta: initialPayload,
  });

  const emitEvent = (event: eventWithTime) => {
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

    // the connection is made on the first event, once rrweb has started (it looks at document.readyState and waits for DOMContentLoaded or load)
    transport?.send(event);
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
            transport?.flush();
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
    transport?.disconnect(); // so `emit` can restart it again if page is unfrozen
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
