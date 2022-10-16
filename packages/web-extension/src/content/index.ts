import Browser from 'webextension-polyfill';
import { nanoid } from 'nanoid';
import type { eventWithTime } from 'rrweb/typings/types';
import {
  LocalData,
  LocalDataKey,
  RecorderStatus,
  ServiceName,
  Session,
  StartRecordResponse,
  StopRecordResponse,
  SyncData,
  SyncDataKey,
} from '../types';
import Channel from '../utils/channel';

const channel = new Channel();

void (async () => {
  let storedEvents: eventWithTime[] = [];
  let startResponseCb: ((response: StartRecordResponse) => void) | undefined =
    undefined;
  // The callback function to remove the recorder from the page.
  let clearRecorderCb: (() => void) | undefined = undefined;
  channel.provide(ServiceName.StartRecord, async () => {
    clearRecorderCb = await startRecord();
    window.postMessage({ message: 'start-record' });
    return new Promise((resolve) => {
      startResponseCb = (response) => {
        resolve(response);
      };
    });
  });
  let stopResponseCb: ((response: StopRecordResponse) => void) | undefined =
    undefined;
  channel.provide(ServiceName.StopRecord, () => {
    window.postMessage({ message: 'stop-record' });
    return new Promise((resolve) => {
      stopResponseCb = (response: StopRecordResponse) => {
        resolve(response);
      };
    });
  });

  window.addEventListener('message', (event) => {
    const data = event.data as
      | StartRecordResponse
      | StopRecordResponse
      | HeartBreathMessage;
    if (data.message === 'start-record-response' && startResponseCb)
      startResponseCb(data);
    else if (data.message === 'stop-record-response' && stopResponseCb) {
      stopResponseCb(data);
      void saveEvents(storedEvents.concat(data.events));
      clearRecorderCb?.();
      clearRecorderCb = undefined;
      storedEvents = [];
    } else if (data.message === 'heart-beat') {
      const events = data.events;
      void Browser.storage.local.set({
        [LocalDataKey.bufferedEvents]: storedEvents.concat(events),
      });
    }
  });

  const localData = (await Browser.storage.local.get()) as LocalData;
  if (localData?.recorder_status?.status === RecorderStatus.RECORDING) {
    clearRecorderCb = await startRecord();
    storedEvents = localData.buffered_events || [];
  }
})();

async function startRecord() {
  const data = await Browser.storage.local.get('recorder_code');
  const recorderCode = data['recorder_code'] as string | undefined;
  if (!recorderCode || recorderCode.length === 0) return;

  const scriptEl = document.createElement('script');
  try {
    const uniqueVariablePrefix = '__rrweb_extension_unique_prefix_';
    const events = `${uniqueVariablePrefix}events`;
    const stopFn = `${uniqueVariablePrefix}stopFn`;
    const setIntervalId = `${uniqueVariablePrefix}setIntervalId`;
    const record = `${uniqueVariablePrefix}record`;
    scriptEl.textContent = `
    ${recorderCode}
    var ${events} = [];
    var ${stopFn} = null;
    var ${setIntervalId} = null;
    
    function ${record}() {
      ${events} = [];
      let recorder;
      try {
        recorder = rrwebRecord;
      } catch (e) {
        recorder = rrweb.record;
      }
      ${stopFn} = recorder({
        emit: (event) => {
          ${events}.push(event);
        },
      });
    }
    
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data.message === 'stop-record') {
        if (${stopFn}) ${stopFn}();
        clearInterval(${setIntervalId});
        window.postMessage({
          message: 'stop-record-response',
          events: ${events},
          endTimestamp: Date.now(),
        });
      }
    });
  
    window.postMessage({
      message: 'start-record-response',
      startTimestamp: Date.now(),
    });
    ${record}();
  
    ${setIntervalId} = setInterval(() => {
      window.postMessage({
        message: 'heart-beat',
        events: ${events},
      });
    }, 50);
    `;
    document.documentElement.appendChild(scriptEl);
    return () => {
      document.documentElement.removeChild(scriptEl);
    };
  } catch (e) {
    document.documentElement.removeChild(scriptEl);
  }
}

async function saveEvents(events: eventWithTime[]) {
  const recorderSettings = (await Browser.storage.sync.get(
    SyncDataKey.settings,
  )) as SyncData;
  const { recorderVersion, recorderURL } = recorderSettings.settings;
  const newSession: Session = {
    id: nanoid(),
    name: document.title,
    tags: [],
    events,
    createTimestamp: Date.now(),
    modifyTimestamp: Date.now(),
    recorderVersion,
    recorderURL,
  };
  const data = (await Browser.storage.local.get(
    LocalDataKey.sessions,
  )) as LocalData;
  if (!data.sessions) data.sessions = {};
  data.sessions[newSession.id] = newSession;
  await Browser.storage.local.set(data);
}

type HeartBreathMessage = {
  message: 'heart-beat';
  events: eventWithTime[];
};
