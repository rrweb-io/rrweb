import Browser from 'webextension-polyfill';
import type { eventWithTime } from '@rrweb/types';
import Channel from '~/utils/channel';
import { EventName, LocalDataKey, SyncDataKey } from '~/types';
import type { CloudAccount, LocalData, Settings, SyncData } from '~/types';
import { createTransport } from '@rrweb/browser-client';
import { config } from '~/config';
import { addSession } from '~/utils/storage';
import { watchRecordedPages } from './pageWatch';
import { createRecorder } from './recorder';
import { createSink } from './sinks';

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

  const sinkDeps = {
    createTransport,
    addSession,
    randomId: () => crypto.randomUUID(),
    getURL: (path: string) => Browser.runtime.getURL(path),
    recorderVersion: Browser.runtime.getManifest().version_name || 'unknown',
  };
  const channel = new Channel();
  const recorder = createRecorder({
    getAccount: async () => {
      if (!config.cloudEnabled) return null;
      const stored = (await Browser.storage.local.get(
        LocalDataKey.cloudAccount,
      )) as LocalData;
      return (
        (stored[LocalDataKey.cloudAccount] as
          | CloudAccount
          | null
          | undefined) ?? null
      );
    },
    getTabUrl: async (tabId) => (await Browser.tabs.get(tabId)).url,
    getTabTitle: async (tabId) => (await Browser.tabs.get(tabId)).title,
    getCurrentTabId: () => channel.getCurrentTabId(),
    injectRecorder,
    requestToTab: (tabId, service, params) =>
      channel.requestToTab(tabId, service, params),
    saveStatus: (status) =>
      Browser.storage.local.set({ [LocalDataKey.recorderStatus]: status }),
    openTab: (url) => Browser.tabs.create({ url }),
    onSessionUpdated: (session) =>
      channel.emit(EventName.SessionUpdated, { session }),
    createSink: (target) => createSink(target, sinkDeps),
    pingBrowser: () => Browser.runtime.getPlatformInfo(),
    every: (ms, tick) => {
      const interval = setInterval(tick, ms);
      return () => clearInterval(interval);
    },
    now: () => Date.now(),
  });
  // Reset recorder status when the extension is reloaded.
  await Browser.storage.local.set({
    [LocalDataKey.recorderStatus]: recorder.getStatus(),
  });

  channel.on(EventName.StartButtonClicked, () => recorder.start());
  channel.on(EventName.StopButtonClicked, () => recorder.stop());
  channel.on(EventName.PauseButtonClicked, () => recorder.pauseClicked());
  channel.on(EventName.ResumeButtonClicked, () => recorder.resumeClicked());
  channel.on(EventName.ContentScriptEmitEvent, (data) => {
    recorder.add(data as eventWithTime);
  });

  // One recording is one tab: it finishes when that tab's document goes away.
  watchRecordedPages(
    {
      onConnect: Browser.runtime.onConnect,
      onTabRemoved: Browser.tabs.onRemoved,
    },
    (tabId) => void recorder.pageGone(tabId),
  );
})();

/**
 * Load the recorder into the top frame of `tabId`. The popup's record button
 * gives the extension `activeTab` access to the current tab, which is what
 * allows the injection; the extension has no standing access to any site.
 */
async function injectRecorder(tabId: number) {
  if (import.meta.env.VITE_TARGET_BROWSER === 'firefox') {
    // MV2 has no page-world injection; the content script adds inject.js.
    await Browser.tabs.executeScript(tabId, { file: '/content/index.js' });
    return;
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/index.js'],
  });
  // A fresh page-world copy for each start and resume.
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/inject.js'],
    world: 'MAIN',
  });
}

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
