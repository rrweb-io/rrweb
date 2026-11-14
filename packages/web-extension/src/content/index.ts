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
} from '~/types';
import Channel from '~/utils/channel';
import { RECORDED_PAGE_PORT } from '~/background/pageWatch';

/**
 * The background injects this script into the top frame of the tab being
 * recorded, when the person presses record. It relays between the background
 * and the page-world script (`inject.ts`), which runs rrweb itself.
 */

declare global {
  interface Window {
    __rrwebExtensionContentLoaded?: boolean;
  }
}

// Record and resume inject this script again; the first copy keeps working.
if (!window.__rrwebExtensionContentLoaded) {
  window.__rrwebExtensionContentLoaded = true;
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

  let startResponseCb: ((response: RecordStartedMessage) => void) | undefined =
    undefined;
  channel.provide(ServiceName.StartRecord, async (params) => {
    keepPagePort();
    pendingStart = params as StartRecordPayload;
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
