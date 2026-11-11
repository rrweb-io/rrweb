import Browser from 'webextension-polyfill';
import Channel from '~/utils/channel';
import { EventName, LocalDataKey, SyncDataKey } from '~/types';
import type {
  FailedUpload,
  LocalData,
  RecordedEvent,
  Settings,
  SyncData,
} from '~/types';
import { createTransport, postEvents } from '@rrweb/browser-client';
import { config } from '~/config';
import {
  addSession,
  deleteFailedUpload,
  getFailedUpload,
  putFailedUpload,
} from '~/utils/storage';
import { createFailedUploads } from './failedUploads';
import { watchRecordedPages } from './pageWatch';
import { createRecorder } from './recorder';
import { createSink, type UnsentUpload } from './sinks';

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

  const storedAccount = async () => {
    if (!config.cloudEnabled) return null;
    const stored = (await Browser.storage.local.get(
      LocalDataKey.cloudAccount,
    )) as LocalData;
    return stored[LocalDataKey.cloudAccount] ?? null;
  };
  const failedUploads = createFailedUploads({
    readList: async () =>
      (
        (await Browser.storage.local.get(
          LocalDataKey.failedUploads,
        )) as LocalData
      )[LocalDataKey.failedUploads] ?? [],
    writeList: (list: FailedUpload[]) =>
      Browser.storage.local.set({ [LocalDataKey.failedUploads]: list }),
    putUpload: putFailedUpload,
    getUpload: getFailedUpload,
    deleteUpload: deleteFailedUpload,
    postEvents,
    openTab: (url) => Browser.tabs.create({ url }),
    currentUserId: async () => (await storedAccount())?.userId ?? null,
  });
  await failedUploads.recoverAfterRestart();

  const sinkDeps = {
    createTransport,
    addSession,
    keepFailedUpload: (upload: UnsentUpload) => failedUploads.keep(upload),
    randomId: () => crypto.randomUUID(),
    getURL: (path: string) => Browser.runtime.getURL(path),
    recorderVersion: Browser.runtime.getManifest().version_name || 'unknown',
  };
  const channel = new Channel();
  const recorder = createRecorder({
    getAccount: storedAccount,
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
    newToken: () => crypto.randomUUID(),
  });
  // Reset recorder status when the extension is reloaded.
  await Browser.storage.local.set({
    [LocalDataKey.recorderStatus]: recorder.getStatus(),
  });

  channel.on(
    EventName.StartButtonClicked,
    (request) => void recorder.start(request),
  );
  channel.on(EventName.StopButtonClicked, () => recorder.stop());
  channel.on(EventName.PauseButtonClicked, () => recorder.pauseClicked());
  channel.on(EventName.ResumeButtonClicked, () => recorder.resumeClicked());
  channel.on(EventName.ContentScriptEmitEvent, (data, sender) => {
    recorder.add(data as RecordedEvent, {
      tabId: sender.tab?.id,
      frameId: sender.frameId,
    });
  });
  // Retry never rejects: a failure is stored as the upload's retry-failed
  // state, which the popup shows. Discard and log out can fail on storage.
  const logFailure = (action: string) => (error: unknown) =>
    console.error(`Could not ${action}:`, error);
  channel.on(EventName.RetryUploadClicked, (data) => {
    const recordingId = stringField(data, 'recordingId');
    if (recordingId !== 'invalid')
      void failedUploads
        .retry(recordingId)
        .catch(logFailure('retry the upload'));
  });
  channel.on(EventName.DiscardUploadClicked, (data) => {
    const recordingId = stringField(data, 'recordingId');
    if (recordingId !== 'invalid')
      void failedUploads
        .discard(recordingId)
        .catch(logFailure('discard the recording'));
  });
  channel.on(EventName.UserLoggedOut, (data) => {
    const userId = stringField(data, 'userId');
    if (userId !== 'invalid')
      void failedUploads
        .forgetUser(userId)
        .catch(logFailure("delete the user's failed uploads"));
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

/** A non-empty string field of a runtime message, or 'invalid'. */
function stringField(data: unknown, key: string): string | 'invalid' {
  if (typeof data !== 'object' || data === null) return 'invalid';
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' && value !== '' ? value : 'invalid';
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
