import Browser from 'webextension-polyfill';
import type { eventWithTime } from 'rrweb/typings/types';
import {
  LocalData,
  LocalDataKey,
  RecorderStatus,
  RecordStartedMessage,
  RecordStoppedMessage,
  ServiceName,
} from '../types';
import type Channel from './channel';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export function formatTime(ms: number): string {
  if (ms <= 0) {
    return '00:00';
  }
  const hour = Math.floor(ms / HOUR);
  ms = ms % HOUR;
  const minute = Math.floor(ms / MINUTE);
  ms = ms % MINUTE;
  const second = Math.floor(ms / SECOND);
  if (hour) {
    return `${padZero(hour)}:${padZero(minute)}:${padZero(second)}`;
  }
  return `${padZero(minute)}:${padZero(second)}`;
}

function padZero(num: number, len = 2): string {
  let str = String(num);
  const threshold = Math.pow(10, len - 1);
  if (num < threshold) {
    while (String(threshold).length > str.length) {
      str = `0${num}`;
    }
  }
  return str;
}

// Pause recording.
export async function pauseRecording(
  channel: Channel,
  newStatus: RecorderStatus,
  status?: LocalData[LocalDataKey.recorderStatus],
) {
  if (!status)
    status = (await Browser.storage.local.get(LocalDataKey.recorderStatus))[
      LocalDataKey.recorderStatus
    ] as LocalData[LocalDataKey.recorderStatus];
  const { startTimestamp, activeTabId } = status;
  const stopResponse = (await channel.requestToTab(
    activeTabId,
    ServiceName.PauseRecord,
    {},
  )) as RecordStoppedMessage;
  if (!stopResponse) return;
  const statusData: LocalData[LocalDataKey.recorderStatus] = {
    status: newStatus,
    activeTabId,
    startTimestamp,
    pausedTimestamp: stopResponse.endTimestamp,
  };
  await Browser.storage.local.set({
    [LocalDataKey.recorderStatus]: statusData,
  });
  return {
    status: statusData,
    bufferedEvents: stopResponse.events,
  };
}

// Resume recording after change to a new tab.
export async function resumeRecording(
  channel: Channel,
  newTabId: number,
  status?: LocalData[LocalDataKey.recorderStatus],
  bufferedEvents?: eventWithTime[],
) {
  if (!status)
    status = (await Browser.storage.local.get(LocalDataKey.recorderStatus))[
      LocalDataKey.recorderStatus
    ] as LocalData[LocalDataKey.recorderStatus];
  if (!bufferedEvents)
    bufferedEvents = ((await Browser.storage.local.get(
      LocalDataKey.bufferedEvents,
    )) as LocalData)[LocalDataKey.bufferedEvents];
  const { startTimestamp, pausedTimestamp } = status;
  const startResponse = (await channel.requestToTab(
    newTabId,
    ServiceName.ResumeRecord,
    { events: bufferedEvents, pausedTimestamp },
  )) as RecordStartedMessage;
  if (!startResponse) return;
  const pausedTime = pausedTimestamp
    ? startResponse.startTimestamp - pausedTimestamp
    : 0;
  const statusData: LocalData[LocalDataKey.recorderStatus] = {
    status: RecorderStatus.RECORDING,
    activeTabId: newTabId,
    startTimestamp:
      (startTimestamp || bufferedEvents[0].timestamp) + pausedTime,
  };
  await Browser.storage.local.set({
    [LocalDataKey.recorderStatus]: statusData,
  });
  return statusData;
}
