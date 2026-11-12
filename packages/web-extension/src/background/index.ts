import Browser from 'webextension-polyfill';
import Channel from '~/utils/channel';
import { EventName, LocalDataKey, SyncDataKey } from '~/types';
import type { FailedUpload, LocalData, Settings, SyncData } from '~/types';
import { createTransport, postEvents } from '@rrweb/browser-client';
import { config, uninstallSurveyUrl } from '~/config';
import {
  addSession,
  deleteFailedUpload,
  deleteSessions,
  findEvents,
  getFailedUpload,
  getSession,
  putFailedUpload,
} from '~/utils/storage';
import { createFailedUploads } from './failedUploads';
import { registerHandlers, type BackgroundServices } from './handlers';
import { watchRecordedPages } from './pageWatch';
import { createBadge } from './badge';
import { createRecorder } from './recorder';
import { createSessionSharing } from './shareSession';
import { createSink, type UnsentUpload } from './sinks';

// Ask people who remove the extension why they left.
const manifest = Browser.runtime.getManifest();
Browser.runtime
  .setUninstallURL(
    uninstallSurveyUrl(manifest.version_name ?? manifest.version),
  )
  .catch(() => {
    // The survey is optional; recording must keep working without it.
  });

// Register every listener before any await: a message that wakes a suspended
// worker is dispatched during its first synchronous run.
const channel = new Channel();
const ready = start();
// Handlers report their own failures; this keeps the rejection handled.
ready.catch((error) => console.error('Could not start the background:', error));
registerHandlers(channel, ready, { shareEnabled: config.cloudEnabled });

// One recording is one tab: it finishes when that tab's document goes away.
watchRecordedPages(
  {
    onConnect: Browser.runtime.onConnect,
    onTabRemoved: Browser.tabs.onRemoved,
  },
  (tabId) =>
    void ready
      .then(({ recorder }) => recorder.pageGone(tabId))
      .catch((error) => console.error('Could not end the recording:', error)),
);

async function start(): Promise<BackgroundServices> {
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
  // MV3 has `action`, MV2 Firefox has `browserAction`.
  const toolbar = Browser.action ?? Browser.browserAction;
  const badge = createBadge({
    setBadge: async (tabId, { text, color }) => {
      await toolbar.setBadgeText({ tabId, text });
      await toolbar.setBadgeBackgroundColor({ tabId, color });
      await toolbar.setBadgeTextColor?.({ tabId, color: '#FFFFFF' });
    },
    clearBadge: (tabId) => toolbar.setBadgeText({ tabId, text: '' }),
  });
  const recorder = createRecorder({
    onStatus: badge.sync,
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
  // The status is IDLE now, so no tab may still show a recording badge.
  Browser.tabs
    .query({})
    .then((tabs) =>
      Promise.all(
        tabs.map((tab) =>
          tab.id === undefined
            ? undefined
            : toolbar.setBadgeText({ tabId: tab.id, text: '' }),
        ),
      ),
    )
    .catch((e) => console.warn('rrweb: clearing stale badges failed', e));

  // Log out keeps the shared map: it only links to the cloud copies.
  const sharing = createSessionSharing({
    getAccount: storedAccount,
    loadSession: async (id) => {
      const events = await findEvents(id);
      const session = await getSession(id);
      return events && session
        ? { events, recorderVersion: session.recorderVersion }
        : undefined;
    },
    deleteStored: deleteSessions,
    readShared: async () =>
      (
        (await Browser.storage.local.get(
          LocalDataKey.sharedSessions,
        )) as LocalData
      )[LocalDataKey.sharedSessions] ?? {},
    writeShared: (shared) =>
      Browser.storage.local.set({ [LocalDataKey.sharedSessions]: shared }),
    // Share IDs are fresh UUIDs, so they never collide with a failed upload.
    putUnsent: putFailedUpload,
    getUnsent: getFailedUpload,
    deleteUnsent: deleteFailedUpload,
    postEvents,
    randomId: () => crypto.randomUUID(),
    openTab: (url) => Browser.tabs.create({ url }),
    now: () => Date.now(),
  });

  return { recorder, failedUploads, sharing };
}

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
