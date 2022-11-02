import Browser from 'webextension-polyfill';
import type { eventWithTime } from 'rrweb/typings/types';
import Channel from '../utils/channel';
import {
  LocalData,
  LocalDataKey,
  RecorderStatus,
  RecordStartedMessage,
  RecordStoppedMessage,
  ServiceName,
  Settings,
  SyncData,
  SyncDataKey,
} from '../types';

const channel = new Channel();

void (async () => {
  // assign default value to settings of this extension
  const result =
    ((await Browser.storage.sync.get(SyncDataKey.settings)) as SyncData) ||
    undefined;
  const defaultSettings: Settings = {};
  let settings = defaultSettings;
  if (result && result.settings) {
    setDefaultSettings(result.settings, defaultSettings);
    settings = result.settings;
  }
  await Browser.storage.sync.set({
    settings,
  } as SyncData);

  // Resume recording after change to a new tab.
  const resumeRecording = async (
    newTabId: number,
    events: eventWithTime[],
    startTimestamp: number,
    pausedTimestamp: number | undefined,
  ) => {
    const startResponse = (await channel.requestToTab(
      newTabId,
      ServiceName.ResumeRecord,
      { events, pausedTimestamp },
    )) as RecordStartedMessage;
    if (!startResponse) return;
    const pausedTime = pausedTimestamp
      ? startResponse.startTimestamp - pausedTimestamp
      : 0;
    const statusData: LocalData[LocalDataKey.recorderStatus] = {
      status: RecorderStatus.RECORDING,
      activeTabId: newTabId,
      startTimestamp: startTimestamp + pausedTime,
    };
    await Browser.storage.local.set({
      [LocalDataKey.recorderStatus]: statusData,
    });
  };

  Browser.tabs.onActivated.addListener((activeInfo) => {
    void Browser.storage.local
      .get(LocalDataKey.recorderStatus)
      .then(async (data) => {
        const localData = data as LocalData;
        if (!localData || !localData[LocalDataKey.recorderStatus]) return;
        let { status, pausedTimestamp } = localData[
          LocalDataKey.recorderStatus
        ];
        const { startTimestamp, activeTabId } = localData[
          LocalDataKey.recorderStatus
        ];
        let bufferedEvents: eventWithTime[] | undefined;

        if (status === RecorderStatus.RECORDING) {
          const stopResponse = (await channel.requestToTab(
            activeTabId,
            ServiceName.PauseRecord,
            {},
          )) as RecordStoppedMessage;
          if (!stopResponse) return;
          const statusData: LocalData[LocalDataKey.recorderStatus] = {
            status: RecorderStatus.PausedSwitch,
            activeTabId: activeInfo.tabId,
            startTimestamp,
            pausedTimestamp: stopResponse.endTimestamp,
          };
          await Browser.storage.local.set({
            [LocalDataKey.recorderStatus]: statusData,
          });
          status = RecorderStatus.PausedSwitch;
          pausedTimestamp = stopResponse.endTimestamp;
          bufferedEvents = stopResponse.events;
        }
        if (status === RecorderStatus.PausedSwitch) {
          if (!bufferedEvents)
            bufferedEvents = ((await Browser.storage.local.get(
              LocalDataKey.bufferedEvents,
            )) as LocalData)[LocalDataKey.bufferedEvents];
          await resumeRecording(
            activeInfo.tabId,
            bufferedEvents,
            startTimestamp || bufferedEvents[0].timestamp,
            pausedTimestamp,
          );
        }
      })
      .catch(() => {
        // the extension can't access to the tab
      });
  });

  Browser.tabs.onUpdated.addListener(function (tabId, info) {
    if (info.status !== 'complete') return;
    void Browser.storage.local
      .get(LocalDataKey.recorderStatus)
      .then(async (data) => {
        const localData = data as LocalData;
        if (!localData || !localData[LocalDataKey.recorderStatus]) return;
        const {
          status,
          activeTabId,
          startTimestamp,
          pausedTimestamp,
        } = localData[LocalDataKey.recorderStatus];
        if (status !== RecorderStatus.PausedSwitch || activeTabId === tabId)
          return;
        const bufferedEvents = ((await Browser.storage.local.get(
          LocalDataKey.bufferedEvents,
        )) as LocalData)[LocalDataKey.bufferedEvents];
        await resumeRecording(
          tabId,
          bufferedEvents,
          startTimestamp || bufferedEvents[0].timestamp,
          pausedTimestamp,
        );
      })
      .catch(() => {
        // the extension can't access to the tab
      });
  });
})();

/**
 * Update existed settings with new settings.
 * Set new setting values if these properties don't exist in older versions.
 */
function setDefaultSettings(
  existedSettings: Record<string, unknown>,
  newSettings: Record<string, unknown>,
) {
  for (const i in newSettings) {
    // settings[i] contains key-value settings
    if (
      typeof newSettings[i] === 'object' &&
      !(newSettings[i] instanceof Array) &&
      Object.keys(newSettings[i] as Record<string, unknown>).length > 0
    ) {
      if (existedSettings[i]) {
        setDefaultSettings(
          existedSettings[i] as Record<string, unknown>,
          newSettings[i] as Record<string, unknown>,
        );
      } else {
        // settings[i] contains several setting items but these have not been set before
        existedSettings[i] = newSettings[i];
      }
    } else if (existedSettings[i] === undefined) {
      // settings[i] is a single setting item and it has not been set before
      existedSettings[i] = newSettings[i];
    }
  }
}
