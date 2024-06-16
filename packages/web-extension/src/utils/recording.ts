import Browser from 'webextension-polyfill';
import type { eventWithTime } from '@saola.ai/rrweb-types';

import {
  LocalData,
  LocalDataKey,
  RecorderStatus,
  RecordStartedMessage,
  RecordStoppedMessage,
  ServiceName,
} from '~/types';
import type Channel from './channel';
import { isFirefox } from '.';

/**
 * Some commonly used functions for session recording.
 */

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
    bufferedEvents = (
      (await Browser.storage.local.get(
        LocalDataKey.bufferedEvents,
      )) as LocalData
    )[LocalDataKey.bufferedEvents];
  const { startTimestamp, pausedTimestamp } = status;
  // On Firefox, the new tab is not communicable immediately after it is created.
  if (isFirefox()) await new Promise((r) => setTimeout(r, 50));
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
