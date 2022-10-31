import Browser from 'webextension-polyfill';
import { nanoid } from 'nanoid';
import type { eventWithTime } from 'rrweb/typings/types';
import {
  LocalData,
  LocalDataKey,
  RecorderStatus,
  ServiceName,
  Session,
  RecordStartedMessage,
  RecordStoppedMessage,
  HeartBreathMessage,
  MessageName,
} from '../types';
import Channel from '../utils/channel';

const channel = new Channel();

void (async () => {
  let storedEvents: eventWithTime[] = [];
  let startResponseCb:
    | ((response: RecordStartedMessage) => void)
    | undefined = undefined;
  // The callback function to remove the recorder from the page.
  let clearRecorderCb: (() => void) | undefined = undefined;
  channel.provide(ServiceName.StartRecord, async () => {
    clearRecorderCb = startRecord();
    return new Promise((resolve) => {
      startResponseCb = (response) => {
        resolve(response);
      };
    });
  });
  let stopResponseCb:
    | ((response: RecordStoppedMessage) => void)
    | undefined = undefined;
  channel.provide(ServiceName.StopRecord, () => {
    window.postMessage({ message: MessageName.StopRecord });
    return new Promise((resolve) => {
      stopResponseCb = (response: RecordStoppedMessage) => {
        resolve(response);
      };
    });
  });

  window.addEventListener(
    'message',
    (event: {
      data:
        | RecordStartedMessage
        | RecordStoppedMessage
        | HeartBreathMessage
        | {
            message: MessageName;
          };
    }) => {
      if (event.data.message === MessageName.RecordScriptReady)
        window.postMessage({ message: MessageName.StartRecord });
      else if (
        event.data.message === MessageName.RecordStarted &&
        startResponseCb
      )
        startResponseCb(event.data as RecordStartedMessage);
      else if (
        event.data.message === MessageName.RecordStopped &&
        stopResponseCb
      ) {
        const data = event.data as RecordStoppedMessage;
        stopResponseCb(data);
        void saveEvents(storedEvents.concat(data.events));
        clearRecorderCb?.();
        clearRecorderCb = undefined;
        storedEvents = [];
      } else if (event.data.message === MessageName.HeartBeat) {
        void Browser.storage.local.set({
          [LocalDataKey.bufferedEvents]: storedEvents.concat(
            (event.data as HeartBreathMessage).events,
          ),
        });
      }
    },
  );

  const localData = (await Browser.storage.local.get()) as LocalData;
  if (localData?.recorder_status?.status === RecorderStatus.RECORDING) {
    clearRecorderCb = startRecord();
    storedEvents = localData.buffered_events || [];
  }
})();

function startRecord() {
  const scriptEl = document.createElement('script');
  scriptEl.src = Browser.runtime.getURL('content/inject.js');
  document.documentElement.appendChild(scriptEl);
  return () => {
    document.documentElement.removeChild(scriptEl);
  };
}

async function saveEvents(events: eventWithTime[]) {
  const newSession: Session = {
    id: nanoid(),
    name: document.title,
    tags: [],
    events,
    createTimestamp: Date.now(),
    modifyTimestamp: Date.now(),
    recorderVersion: Browser.runtime.getManifest().version_name || 'unknown',
  };
  const data = (await Browser.storage.local.get(
    LocalDataKey.sessions,
  )) as LocalData;
  if (!data.sessions) data.sessions = {};
  data.sessions[newSession.id] = newSession;
  await Browser.storage.local.set(data);
}
