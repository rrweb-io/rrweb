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

type serverConfig = {
  serverUrl: string;
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
    value = self.crypto.randomUUID() + ':1';
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

const buffer: ArrayQueue<string> = new ArrayQueue();
let rrwebStopFn: listenerHandler | undefined;

type websocketListenerHandler = (i: Websocket, ev: MessageEvent) => void;

function connect(
  serverUrl: string,
  messageHandler: websocketListenerHandler,
): Websocket {
  const ws = new WebsocketBuilder(serverUrl)
    .withBuffer(buffer) // when disconnected
    .withBackoff(
      new ExponentialBackoff(500 + Math.round(1000 * Math.random()), 6),
    ) // retry around every 1s, 2s, 4s, 8s, maxing out with a retry every ~1minute
    .build();

  // Add event listeners
  ws.addEventListener(WebsocketEvent.open, () => console.debug('opened!'));
  ws.addEventListener(WebsocketEvent.close, () => console.debug('closed!'));
  ws.addEventListener(WebsocketEvent.message, messageHandler);
  return ws;
}

function start(
  options: recordOptions<eventWithTime> & serverConfig = {
    serverUrl: 'ws://localhost:40000',
    omitPii: false,
  },
) {
  let { serverUrl, omitPii, ...recordOptions } = options;

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
  let connectionPaused = false;

  const handleMessage = (i: Websocket, ev: MessageEvent) => {
    if (ev.data.type === 'error') {
      console.warn(
        `received error, pausing websockets: ${JSON.stringify(ev.data)}`,
      );
      connectionPaused = true;
      //i.close();
    } else {
      console.log(`received message: ${ev.data}`);
    }
  };

  recordOptions.emit = (event) => {
    if (!ws) {
      // don't make a connection until rrweb starts (looks at document.readyState and waits for DOMContentLoaded or load)

      const recordingId = getSetRecordingId();

      const payload = {
        domain: document.location.hostname || document.location.href, // latter is for debugging (e.g. a file:// url)
        omitPii, // tell server not to store IP addresses or user agents
      };

      if (serverUrl.includes('{recordingId}')) {
        serverUrl = serverUrl.replace('{recordingId}', recordingId);
      } else {
        payload.recordingId = recordingId;
      }
      ws = connect(serverUrl, handleMessage);

      if (!omitPii) {
        payload.visitor = getSetVisitorId();
        try {
          payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
          payload.timezone = 'unknown';
        }
        // payload.userAgent = navigator.userAgent;  // we should be able to get this server side
        // the following is different to EventType.Meta width/height
        // which is used in replay; it's more about what size screen
        // the visitor has for analytics
        payload.screen = {
          width: screen.width,
          height: screen.height,
          dpi: screen.dpi,
        };
      }
      const metaEvent: customEventWithTime = {
        timestamp: record.nowTimestamp(),
        type: EventType.Custom,
        data: {
          tag: 'recording-meta',
          payload,
        },
      };
      // establish the connection with metadata to set up the session server side
      ws.send(JSON.stringify(metaEvent));
    }
    if (clientEmit !== undefined) {
      clientEmit(event);
    }
    if (event.type === EventType.Meta && !omitPii) {
      event.data.title = document.title.substring(0, 500);
      event.data.referrer = document.referrer; // could potentially contain PII
    } else if (event.type === EventType.FullSnapshot) {
      console.log('got fullsnapshot');
    }

    const eventStr = JSON.stringify(event);
    if (!connectionPaused) {
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
    }
    if (rrwebStopFn !== undefined) {
      rrwebStopFn();
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

type nameValues = Record<string,string>;

function addMeta(payload: nameValues) {
  addCustomEvent('recording-meta', payload);
}

function addPageviewMeta(payload: nameValues) {
  // could alter timestamp to match Meta/FullSnapshot event
  addCustomEvent('pageview-meta', payload);
}

if (document && document.currentScript) {
  let config = {};
  const truthyAttr = ['', 'yes', 'on', 'true', '1'];  // empty string allows setting plain html5 attributes without values
  if (document.currentScript.innerText.trim()) {
    try {
      config = JSON.parse(
        document.currentScript.innerText
          .replace(/^\s*\/\/.*/gm, '') // remove comment lines
          .replace(/,(\s*[\]}])/g, '$1'), // allow trailing commas
      );
    } catch (e) {
      /* this allows bare prop names and single quoted values:
         {
           blockSelector: '.my-block-selector',
         }
      */
      config = looseJsonParse(document.currentScript.innerText);
    }
  }
  if (truthyAttr.includes(document.currentScript.getAttribute('omitpii'))) {
    config.omitPii = true;
  }
  if (
    config.autostart ||
    truthyAttr.includes(document.currentScript.getAttribute('autostart'))
  ) {
    start(config);
  }
}
function looseJsonParse(obj) {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_direct_eval!
  return eval?.(`"use strict";(${obj})`);
}

export { start, addMeta, addPageviewMeta, addCustomEvent, getRecordingId };
