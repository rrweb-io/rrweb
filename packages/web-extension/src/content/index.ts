import Browser, { type Runtime } from 'webextension-polyfill';
import {
  ServiceName,
  type RecordStartedMessage,
  type RecordStoppedMessage,
  MessageName,
  type EmitEventMessage,
  type StartRecordPayload,
  type RecordedEvent,
  EventName,
  OTHER_SITE_ERROR,
} from '~/types';
import Channel from '~/utils/channel';
import { RECORDED_PAGE_PORT } from '~/background/pageWatch';

/**
 * The background injects this script into the top frame of the tab being
 * recorded, when the person presses record. It relays between the background
 * and the page-world script (`inject.ts`), which runs rrweb itself.
 */

// Record and resume inject this script again; the first copy keeps working.
// The mark lives on the content script's own global: Firefox can clear a
// property on the page's window across Back while keeping this script's
// listeners, and a second copy would forward every event twice.
const contentGlobal = globalThis as { __rrwebExtensionContentLoaded?: true };
if (!contentGlobal.__rrwebExtensionContentLoaded) {
  contentGlobal.__rrwebExtensionContentLoaded = true;
  init();
}

function init() {
  const channel = new Channel();

  // Open while this document lives, so the background learns when it goes.
  let pagePort: Runtime.Port | null = null;
  const keepPagePort = () => {
    if (pagePort) return;
    pagePort = Browser.runtime.connect({ name: RECORDED_PAGE_PORT });
    // the background restarted; reconnect on the next start
    pagePort.onDisconnect.addListener(() => {
      pagePort = null;
    });
  };
  keepPagePort();

  // The page script is listening for StartRecord.
  let pageScriptReady = false;
  // A start the background asked for, waiting for the page script.
  let pendingStart: StartRecordPayload | undefined;
  const startWhenReady = () => {
    if (!pageScriptReady || !pendingStart) return;
    const { config, token } = pendingStart;
    pendingStart = undefined;
    window.postMessage(
      { message: MessageName.StartRecord, config, token },
      location.origin,
    );
  };

  // A page kept in the back/forward cache can keep its port open in older
  // Chrome versions, so leaving it says the document is gone explicitly.
  // The page script stops itself at the same moment, so a restored page
  // records nothing and needs a fresh page script to start again.
  window.addEventListener('pagehide', () => {
    pagePort?.disconnect();
    pagePort = null;
    pendingStart = undefined;
    pageScriptReady = false;
  });

  let startResponseCb: ((response: RecordStartedMessage) => void) | undefined =
    undefined;
  channel.provide(ServiceName.StartRecord, async (params) => {
    const start = params as StartRecordPayload;
    // The tab may have moved to another site since the background checked.
    if (start.origin !== undefined && start.origin !== location.origin)
      throw new Error(OTHER_SITE_ERROR);
    keepPagePort();
    pendingStart = start;
    // Chrome injects the page script into the page world itself. Firefox has
    // no page-world injection, so this script adds it as a <script> tag.
    if (!pageScriptReady && import.meta.env.VITE_TARGET_BROWSER === 'firefox')
      addPageScriptTag();
    startWhenReady();
    return new Promise((resolve) => {
      startResponseCb = resolve;
    });
  });
  let stopResponseCb: ((response: RecordStoppedMessage) => void) | undefined =
    undefined;
  channel.provide(ServiceName.StopRecord, () => {
    // A start still waiting for the page script must not begin after Stop.
    pendingStart = undefined;
    // Nothing records before the page script is ready, so there is nothing
    // to stop and nobody to answer.
    if (!pageScriptReady)
      return Promise.resolve({
        message: MessageName.RecordStopped,
        endTimestamp: Date.now(),
      });
    window.postMessage({ message: MessageName.StopRecord });
    return new Promise((resolve) => {
      stopResponseCb = (response: RecordStoppedMessage) => {
        stopResponseCb = undefined;
        resolve(response);
      };
    });
  });

  window.addEventListener(
    'message',
    (
      event: MessageEvent<
        | RecordStartedMessage
        | RecordStoppedMessage
        | EmitEventMessage
        | {
            message: MessageName;
          }
      >,
    ) => {
      if (event.source !== window) return;
      const { message } = event.data;
      if (message === MessageName.RecordScriptReady) {
        pageScriptReady = true;
        startWhenReady();
      } else if (message === MessageName.RecordStarted && startResponseCb)
        startResponseCb(event.data as RecordStartedMessage);
      else if (message === MessageName.RecordStopped) {
        // the page script stops listening once it stops recording
        pageScriptReady = false;
        // On firefox, the event.data is immutable, so we need to clone it to avoid errors.
        if (stopResponseCb)
          stopResponseCb({ ...(event.data as RecordStoppedMessage) });
      } else if (message === MessageName.EmitEvent) {
        const { event: recorded, token } = event.data as EmitEventMessage;
        const forwarded: RecordedEvent = { event: recorded, token };
        channel.emit(EventName.ContentScriptEmitEvent, forwarded);
      }
    },
  );
}

function addPageScriptTag() {
  const scriptEl = document.createElement('script');
  scriptEl.src = Browser.runtime.getURL('content/inject.js');
  document.documentElement.appendChild(scriptEl);
  scriptEl.onload = () => {
    document.documentElement.removeChild(scriptEl);
  };
}
