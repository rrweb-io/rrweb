import Browser from 'webextension-polyfill';
import {
  type LocalData,
  LocalDataKey,
  RecorderStatus,
  ServiceName,
  type RecordStartedMessage,
  type RecordStoppedMessage,
  MessageName,
  type EmitEventMessage,
  EventName,
} from '~/types';
import Channel from '~/utils/channel';

const channel = new Channel();

void (() => {
  window.addEventListener(
    'message',
    (
      event: MessageEvent<{
        message: MessageName;
      }>,
    ) => {
      if (event.source !== window) return;
      if (event.data.message === MessageName.RecordScriptReady)
        window.postMessage(
          {
            message: MessageName.StartRecord,
            config: {
              // Cross-origin iframe events must not be forwarded through the
              // embedding page's window. That would make the recorded data
              // visible to scripts in the parent page.
              recordCrossOriginIframes: false,
            },
          },
          location.origin,
        );
    },
  );
  // Same-origin iframes are recorded by rrweb from the top-level document.
  // Do not start an independent recorder in cross-origin frames: rrweb's
  // cross-origin transport uses window.parent.postMessage(), which is
  // observable by the untrusted embedding page.
  if (window === window.top) {
    void initMainPage();
  }
})();

async function initMainPage() {
  let startResponseCb: ((response: RecordStartedMessage) => void) | undefined =
    undefined;
  channel.provide(ServiceName.StartRecord, async () => {
    startRecord();
    return new Promise((resolve) => {
      startResponseCb = (response) => {
        resolve(response);
      };
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
      else if (
        event.data.message === MessageName.RecordStarted &&
        startResponseCb
      )
        startResponseCb(event.data as RecordStartedMessage);
      else if (
        event.data.message === MessageName.RecordStopped &&
        stopResponseCb
      ) {
        // On firefox, the event.data is immutable, so we need to clone it to avoid errors.
        const data = { ...(event.data as RecordStoppedMessage) };
        stopResponseCb(data);
      } else if (event.data.message === MessageName.EmitEvent)
        channel.emit(
          EventName.ContentScriptEmitEvent,
          (event.data as EmitEventMessage).event,
        );
    },
  );

  const localData = (await Browser.storage.local.get()) as LocalData;
  if (
    localData?.[LocalDataKey.recorderStatus]?.status ===
    RecorderStatus.RECORDING
  ) {
    startRecord();
  }
}

function startRecord() {
  const scriptEl = document.createElement('script');
  scriptEl.src = Browser.runtime.getURL('content/inject.js');
  document.documentElement.appendChild(scriptEl);
  scriptEl.onload = () => {
    document.documentElement.removeChild(scriptEl);
  };
}
