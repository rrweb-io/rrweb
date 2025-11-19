import { record } from '@rrweb/record';

import { EventType } from '@rrweb/types';
import type { customEvent, eventWithTime, listenerHandler } from '@rrweb/types';
import type { recordOptions } from 'rrweb';

import {
  ArrayQueue,
  ExponentialBackoff,
  Websocket,
  WebsocketBuilder,
  WebsocketEvent,
} from 'websocket-ts';

type clientConfig = {
  serverUrl: string;
  autostart: boolean;
  includePii: boolean;
};

let defaultClientConfig = {
  serverUrl: 'ws://localhost:40000',
  autostart: false,
  includePii: false,
};

export type customEventWithTime = customEvent & {
  timestamp: number;
};

function getSetVisitorId() {
  const nameEQ = 'rrweb-cloud-visitor-id=';
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
  const name = 'rrweb-cloud-recording-id';
  let value: string | null = null;
  try {
    value = sessionStorage.getItem(name);
    if (!value) {
      value = self.crypto.randomUUID();
      try {
        sessionStorage.setItem(name, value);
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
const getRecordingId = getSetRecordingId;

const ws_limit = 10e5; // this is approximate and depends on the browser, also on how unicode is encoded (we are comparing against the length of a javascript string)
const buffer: ArrayQueue<string> = new ArrayQueue();
let rrwebStopFn: listenerHandler | undefined;

type websocketListenerHandler = (i: Websocket, ev: MessageEvent) => void;

function connect(
  serverUrl: string,
  postUrl: string,
  messageHandler: websocketListenerHandler,
): Websocket {
  const ws = new WebsocketBuilder(serverUrl)
    .withBuffer(buffer) // when disconnected
    .withBackoff(
      new ExponentialBackoff(500 + Math.round(1000 * Math.random()), 6),
    ) // retry around every 1s, 2s, 4s, 8s, maxing out with a retry every ~1minute
    .build();

  let fallbackPosting = setInterval(() => {
    if (buffer.length()) {
      postData(postUrl, buffer);
    }
  }, 5 * 1000);

  // Add event listeners
  ws.addEventListener(WebsocketEvent.open, () => {
    clearInterval(fallbackPosting);
  });
  ws.addEventListener(WebsocketEvent.message, messageHandler);
  return ws;
}

async function postData(postUrl: string, buffer: ArrayQueue<string> | string) {
  const keepalive_limit = 65000;
  let done = false;
  const responses = [];
  while (true) {
    let body;
    if (buffer instanceof ArrayQueue) {
      // this clears the buffer so no need to call buffer.clear()
      const to_send = [];
      let send_size = 0;
      done = true;
      for (let ele = buffer.read(); ele !== undefined; ele = buffer.read()) {
        to_send.push(ele);
        send_size += ele.length;
        if (send_size > keepalive_limit) {
          done = false;
          break;
        }
      }
      body = to_send.join('\n');
    } else {
      body = buffer;
      done = true;
    }
    try {
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
        body,
        keepalive: body.length < keepalive_limit, // don't abort POST after end of session (must be under the limit)
      });
      responses.push(response);
    } catch (error) {
      console.error('Error POSTing events:', error);
      return false;
    }
    if (done) {
      break;
    }
  }
  return responses;
}

function start(
  options: recordOptions<eventWithTime> & clientConfig = defaultClientConfig,
) {
  let { serverUrl, includePii, ...recordOptions } = options;

  if (recordOptions.slimDOMOptions === undefined) {
    recordOptions.slimDOMOptions = 'all';
  }
  if (recordOptions.maskAllInputs === undefined) {
    recordOptions.maskAllInputs = true; // default to more privacy
  }
  if (recordOptions.captureAssets === undefined) {
    recordOptions.captureAssets = {};
  }
  if (recordOptions.captureAssets.video === undefined) {
    recordOptions.captureAssets.video = false;
  }
  if (recordOptions.captureAssets.audio === undefined) {
    recordOptions.captureAssets.audio = false;
  }
  if (recordOptions.captureAssets.stylesheets === undefined) {
    recordOptions.captureAssets.stylesheets = true; // inlineStylesheet as Asset
  }

  let clientEmit = undefined;
  if (recordOptions.emit) {
    clientEmit = recordOptions.emit;
  }
  let ws: Websocket;
  let wsConnectionPaused = false;

  const handleMessage = (i: Websocket, ev: MessageEvent) => {
    const event = JSON.parse(ev.data);
    if (
      event.type === 'error' ||
      (event.type === 'upstream-result' && !event.ok)
    ) {
      console.warn('received error, pausing websockets:', event);
      wsConnectionPaused = true;
    } else {
      console.log(`received message: ${ev.data}`);
    }
  };

  const recordingId = getSetRecordingId();
  if (!recordingId) {
    // TODO: we could allow client to supply their own recordingId
    // however that would have implications on how we can handle
    // recordings server side (that a recording could mix events from
    // multiple browsing contexts)
    console.error('rrweb-cloud: Unable to start(); sessionStorage unavailable');
    return;
  }

  const initialPayload: nameValues = {
    domain: document.location.hostname || document.location.href, // latter is for debugging (e.g. a file:// url)
    includePii, // tell server not to store IP addresses or user agents
  };

  if (serverUrl.includes('{recordingId}')) {
    serverUrl = serverUrl.replace('{recordingId}', recordingId);
  } else {
    initialPayload.recordingId = recordingId;
  }
  let postUrl = serverUrl;
  if (postUrl.endsWith('/ws')) {
    postUrl = postUrl.substring(0, postUrl.length - 3);
  }
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

  recordOptions.emit = (event) => {
    if (!ws) {
      // don't make a connection until rrweb starts (looks at document.readyState and waits for DOMContentLoaded or load)
      ws = connect(serverUrl, postUrl, handleMessage);

      ws.addEventListener(WebsocketEvent.close, () => {
        wsConnectionPaused = false;
        ws = undefined; // so we can retry again if connection restarts
      });

      const metaEvent: customEventWithTime = {
        timestamp: record.nowTimestamp(),
        type: EventType.Custom,
        data: {
          tag: 'recording-meta',
          initialPayload,
        },
      };
      // establish the connection with metadata to set up the session server side
      ws.send(JSON.stringify(metaEvent));
    }
    if (clientEmit !== undefined) {
      clientEmit(event);
    }
    if (event.type === EventType.Meta && includePii) {
      event.data.title = document.title.substring(0, 500); // already recorded in rrweb as part of the <title> element
      event.data.referrer = document.referrer; // could potentially contain PII
    }

    const eventStr = JSON.stringify(event);
    // TODO: add browser native compression
    if (eventStr.length > ws_limit) {
      postData(postUrl, eventStr);
    } else if (ws && !wsConnectionPaused) {
      ws.send(eventStr);
    } else {
      buffer.add(eventStr);
    }
  };

  let startWhenVisible = false;
  if (!document.hidden) {
    rrwebStopFn = record(recordOptions);
  } else {
    startWhenVisible = true;
  }
  if (typeof document.hidden !== 'undefined') {
    document.addEventListener(
      'visibilitychange',
      () => {
        if (!document.hidden && startWhenVisible) {
          rrwebStopFn = record(recordOptions);
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
              postData(postUrl, buffer);
            }
          }
        } catch (e) {
          // recording may not be active yet
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
      wsConnectionPaused = false;
      ws = undefined; // so `emit` can restart it again if page is unfrozen
    }
    if (rrwebStopFn !== undefined) {
      rrwebStopFn();
      startWhenVisible = true;
    }
  });
}

const addCustomEvent = <T>(tag: string, payload: T) => {
  if (rrwebStopFn !== undefined) {
    record.addCustomEvent(tag, payload);
  } else {
    const customEvent: customEventWithTime = {
      timestamp: record.nowTimestamp(),
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

type nameValues = Record<string, string | boolean | number>;

function addMeta(payload: nameValues) {
  addCustomEvent('recording-meta', payload);
}

function addPageviewMeta(payload: nameValues) {
  // could alter timestamp to match Meta/FullSnapshot event
  addCustomEvent('pageview-meta', payload);
}

if (document && document.currentScript) {
  let config = defaultClientConfig;
  const truthyAttr: readonly (string | null)[] = ['', 'yes', 'on', 'true', '1']; // empty string allows setting plain html5 attributes without values
  const self = document.currentScript as HTMLScriptElement;
  if (self.innerText && self.innerText.trim()) {
    try {
      config = JSON.parse(
        self.innerText
          .replace(/^\s*\/\/.*/gm, '') // remove comment lines
          .replace(/,(\s*[\]}])/g, '$1'), // allow trailing commas
      );
    } catch (e) {
      /* this allows bare prop names and single quoted values:
         {
           blockSelector: '.my-block-selector',
         }
      */
      config = looseJsonParse(self.innerText);
    }
  }
  if (truthyAttr.includes(self.getAttribute('includepii'))) {
    config.includePii = true;
  }
  if (self.src) {
    try {
      const srcUrl = new URL(self.src);
      if (srcUrl.hostname) {
        let apiHost = srcUrl.hostname;
        if (!apiHost.startsWith('api.')) {
          apiHost = 'api.' + apiHost;
        }
        if (!config.serverUrl) {
          config.serverUrl = `https://${apiHost}/recordings/{recordingId}/ingest/ws`;
        }
      }
    } catch (e) {}
  }
  if (config.autostart || truthyAttr.includes(self.getAttribute('autostart'))) {
    start(config);
  } else {
    // if they manually start later
    defaultClientConfig = config;
  }
}
function looseJsonParse(obj) {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_direct_eval!
  return eval?.(`"use strict";(${obj})`);
}

export { start, addMeta, addPageviewMeta, addCustomEvent, getRecordingId };
