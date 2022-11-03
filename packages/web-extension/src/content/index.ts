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
  channel.provide(ServiceName.ResumeRecord, async (params) => {
    const { events, pausedTimestamp } = params as {
      events: eventWithTime[];
      pausedTimestamp: number;
    };
    storedEvents = events;
    clearRecorderCb = startRecord();
    return new Promise((resolve) => {
      startResponseCb = (response) => {
        const pausedTime = response.startTimestamp - pausedTimestamp;
        // Decrease the time spent in the pause state and make them look like a continuous recording.
        storedEvents.forEach((event) => {
          event.timestamp += pausedTime;
        });
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
        stopResponseCb = undefined;
        const session = saveEvents(response.events);
        session.events = [];
        response.session = session;
        storedEvents = [];
        resolve(response);
      };
    });
  });
  channel.provide(ServiceName.PauseRecord, () => {
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
        data.events = storedEvents.concat(data.events);
        clearRecorderCb?.();
        clearRecorderCb = undefined;
        stopResponseCb(data);
        void Browser.storage.local.set({
          [LocalDataKey.bufferedEvents]: storedEvents.concat(data.events),
        });
      } else if (event.data.message === MessageName.HeartBeat)
        void Browser.storage.local.set({
          [LocalDataKey.bufferedEvents]: storedEvents.concat(
            (event.data as HeartBreathMessage).events,
          ),
        });
    },
  );

  const localData = (await Browser.storage.local.get()) as LocalData;
  if (
    localData?.[LocalDataKey.recorderStatus]?.status ===
    RecorderStatus.RECORDING
  ) {
    clearRecorderCb = startRecord();
    storedEvents = localData[LocalDataKey.bufferedEvents] || [];
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

function saveEvents(events: eventWithTime[]) {
  const newSession: Session = {
    id: nanoid(),
    name: document.title,
    tags: [],
    events,
    createTimestamp: Date.now(),
    modifyTimestamp: Date.now(),
    recorderVersion: Browser.runtime.getManifest().version_name || 'unknown',
  };
  void Browser.storage.local.get(LocalDataKey.sessions).then((res) => {
    const data = res as LocalData;
    if (!data.sessions) data.sessions = {};
    data.sessions[newSession.id] = newSession;
    void Browser.storage.local.set(data);
  });

  return {
    ...newSession,
  };
}
