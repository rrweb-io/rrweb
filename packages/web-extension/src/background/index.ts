import Browser from 'webextension-polyfill';
import type { eventWithTime } from '@saola.ai/rrweb-types';
import Channel from '~/utils/channel';
import {
  LocalData,
  LocalDataKey,
  RecorderStatus,
  Settings,
  SyncData,
  SyncDataKey,
} from '~/types';
import { pauseRecording, resumeRecording } from '~/utils/recording';

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

  // When tab is changed during the recording process, pause recording in the old tab and start a new one in the new tab.
  Browser.tabs.onActivated.addListener((activeInfo) => {
    Browser.storage.local
      .get(LocalDataKey.recorderStatus)
      .then(async (data) => {
        const localData = data as LocalData;
        if (!localData || !localData[LocalDataKey.recorderStatus]) return;
        let statusData = localData[LocalDataKey.recorderStatus];
        let { status } = statusData;
        let bufferedEvents: eventWithTime[] | undefined;

        if (status === RecorderStatus.RECORDING) {
          const result = await pauseRecording(
            channel,
            RecorderStatus.PausedSwitch,
            statusData,
          ).catch(async () => {
            /**
             * This error happen when the old tab is closed.
             * In this case, the recording process would be stopped through Browser.tabs.onRemoved API.
             * So we just read the new status here.
             */
            const localData = (await Browser.storage.local.get(
              LocalDataKey.recorderStatus,
            )) as LocalData;
            return {
              status: localData[LocalDataKey.recorderStatus],
              bufferedEvents,
            };
          });
          if (!result) return;
          statusData = result.status;
          status = statusData.status;
          bufferedEvents = result.bufferedEvents;
        }
        if (status === RecorderStatus.PausedSwitch)
          await resumeRecording(
            channel,
            activeInfo.tabId,
            statusData,
            bufferedEvents,
          );
      })
      .catch(() => {
        // the extension can't access to the tab
      });
  });

  // If the recording can't start on an invalid tab, resume it when the tab content is updated.
  Browser.tabs.onUpdated.addListener(function (tabId, info) {
    if (info.status !== 'complete') return;
    Browser.storage.local
      .get(LocalDataKey.recorderStatus)
      .then(async (data) => {
        const localData = data as LocalData;
        if (!localData || !localData[LocalDataKey.recorderStatus]) return;
        const { status, activeTabId } = localData[LocalDataKey.recorderStatus];
        if (status !== RecorderStatus.PausedSwitch || activeTabId === tabId)
          return;
        await resumeRecording(
          channel,
          tabId,
          localData[LocalDataKey.recorderStatus],
        );
      })
      .catch(() => {
        // the extension can't access to the tab
      });
  });

  /**
   * When the current tab is closed, the recording events will be lost because this event is fired after it is closed.
   * This event listener is just used to make sure the recording status is updated.
   */
  Browser.tabs.onRemoved.addListener((tabId) => {
    Browser.storage.local
      .get(LocalDataKey.recorderStatus)
      .then(async (data) => {
        const localData = data as LocalData;
        if (!localData || !localData[LocalDataKey.recorderStatus]) return;
        const { status, activeTabId, startTimestamp } =
          localData[LocalDataKey.recorderStatus];
        if (activeTabId !== tabId || status !== RecorderStatus.RECORDING)
          return;

        // Update the recording status to make it resumable after users switch to other tabs.
        const statusData: LocalData[LocalDataKey.recorderStatus] = {
          status: RecorderStatus.PausedSwitch,
          activeTabId,
          startTimestamp,
          pausedTimestamp: Date.now(),
        };
        await Browser.storage.local.set({
          [LocalDataKey.recorderStatus]: statusData,
        });
      })
      .catch((err) => {
        console.error(err);
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
