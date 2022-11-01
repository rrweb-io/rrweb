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
    duration: number | undefined,
  ) => {
    const startResponse = (await channel.requestToTab(
      newTabId,
      ServiceName.ResumeRecord,
      { events },
    )) as RecordStartedMessage;
    if (!startResponse) return;
    await Browser.storage.local.set({
      [LocalDataKey.recorderStatus]: {
        status: RecorderStatus.RECORDING,
        activeTabId: newTabId,
        startTimestamp: startResponse.startTimestamp - (duration || 0),
      },
    });
  };

  Browser.tabs.onActivated.addListener((activeInfo) => {
    void Browser.storage.local
      .get(LocalDataKey.recorderStatus)
      .then(async (data) => {
        const localData = data as LocalData;
        if (!localData || !localData.recorder_status) return;
        const {
          status,
          startTimestamp,
          activeTabId,
        } = localData.recorder_status;
        if (
          status !== RecorderStatus.RECORDING ||
          activeTabId === activeInfo.tabId
        )
          return;

        const stopResponse = (await channel.requestToTab(
          activeTabId,
          ServiceName.PauseRecord,
          {},
        )) as RecordStoppedMessage;
        if (!stopResponse) return;
        const duration = startTimestamp
          ? stopResponse.endTimestamp - startTimestamp
          : undefined;
        await Browser.storage.local.set({
          [LocalDataKey.recorderStatus]: {
            status: RecorderStatus.PausedSwitch,
            duration,
          },
        });
        await resumeRecording(activeInfo.tabId, stopResponse.events, duration);
      })
      .catch(() => {
        // the extension can't access to the tab
      });
  });

  Browser.tabs.onUpdated.addListener(function (tabId, info) {
    if (info.status !== 'complete') return;
    void Browser.storage.local
      .get()
      .then((data) => {
        const localData = data as LocalData;
        if (!localData || !localData.recorder_status) return;
        const { status, activeTabId, duration } = localData.recorder_status;
        if (status !== RecorderStatus.PausedSwitch || activeTabId === tabId)
          return;
        return resumeRecording(tabId, localData.buffered_events, duration);
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
