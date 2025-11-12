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

function getSetTabId() {
  const name = 'rrweb-cloud-tab-id';
  let value: string | null = null;
  try {
    value = sessionStorage.getItem(name);
    if (!value) {
      value = self.crypto.randomUUID().split('-')[0];
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

function connect(serverUrl: string): Websocket {
  const ws = new WebsocketBuilder(serverUrl)
    .withBuffer(new ArrayQueue()) // when disconnected
    .withBackoff(
      new ExponentialBackoff(500 + Math.round(1000 * Math.random()), 6),
    ) // retry around every 1s, 2s, 4s, 8s, maxing out with a retry every ~1minute
    .build();

  // Function to output & echo received messages
  const echoOnMessage = (i: Websocket, ev: MessageEvent) => {
    console.log(`received message: ${ev.data}`);
    i.send(`echo: ${ev.data}`);
  };

  // Add event listeners
  ws.addEventListener(WebsocketEvent.open, () => console.log('opened!'));
  ws.addEventListener(WebsocketEvent.close, () => console.log('closed!'));
  ws.addEventListener(WebsocketEvent.message, echoOnMessage);
  return ws;
}

function start(
  options: recordOptions<eventWithTime> & serverConfig = {
    serverUrl: 'ws://localhost:40000',
  },
) {
  const { serverUrl, ...recordOptions } = options;

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
  recordOptions.emit = (event) => {
    if (!ws) {
      // don't make a connection until rrweb starts (looks at document.readyState and waits for DOMContentLoaded or load)
      ws = connect(serverUrl);

      const metaEvent: customEvent = {
        type: EventType.Custom,
        data: {
          tag: 'metadata',
          payload: {
            domain: document.location.hostname || document.location.href, // latter is for debugging (e.g. a file:// url)
            visitor: getSetVisitorId(),
            tab: getSetTabId(),
            timezone,
          },
        },
      };
      // establish the connection with metadata to set up the session server side
      ws.send(JSON.stringify(metaEvent));
    }
    if (clientEmit !== undefined) {
      clientEmit(event);
    }
    if (event.type === EventType.FullSnapshot) {
      console.log('got fullsnapshot');
    }

    const event_str = JSON.stringify(event);
    ws.send(event_str);
  };

  let rrwebStopFn: listenerHandler | undefined;
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

start();
