import Browser from 'webextension-polyfill';
import Channel from '~/utils/channel';
import { EventName, LocalDataKey, SyncDataKey } from '~/types';
import type { CloudAccount, LocalData, Settings, SyncData } from '~/types';
import { config, uninstallSurveyUrl } from '~/config';
import { parseConnection } from '~/utils/connection';
import {
  addSession,
  deleteSessions,
  deleteUnsentEvents,
  getEvents,
  getSession,
  getUnsentEvents,
  putUnsentEvents,
} from '~/utils/storage';
import { createExternalListener } from './external';
import { registerHandlers, type BackgroundServices } from './handlers';
import { watchRecordedPages } from './pageWatch';
import { createBadge } from './badge';
import { KEEPALIVE_INTERVAL_MS, createRecorder } from './recorder';
import { createSessionSharing } from './shareSession';
import { createSink } from './sinks';
import { uploadEvents } from './upload';

// Ask people who remove the extension why they left.
const manifest = Browser.runtime.getManifest();
Browser.runtime
  .setUninstallURL(
    uninstallSurveyUrl(manifest.version_name ?? manifest.version),
  )
  .catch(() => {
    // The survey is optional; recording must keep working without it.
  });

/** The organization the dashboard connected; never one on Firefox. */
const getConnection = async () => {
  if (!config.cloudEnabled) return parseConnection(undefined);
  const stored = (await Browser.storage.local.get(
    LocalDataKey.cloudAccount,
  )) as LocalData;
  return parseConnection(stored[LocalDataKey.cloudAccount]);
};

// Register every listener before any await: a message that wakes a suspended
// worker is dispatched during its first synchronous run.
const channel = new Channel();
const ready = start();
// Handlers report their own failures; this keeps the rejection handled.
ready.catch((error) => console.error('Could not start the background:', error));
registerHandlers(channel, ready, {
  shareEnabled: config.cloudEnabled,
  keepAliveWhile: async (work) => {
    // A browser call resets the idle timer, as the recorder's keepalive does.
    const interval = setInterval(
      () => void Browser.runtime.getPlatformInfo(),
      KEEPALIVE_INTERVAL_MS,
    );
    try {
      return await work;
    } finally {
      clearInterval(interval);
    }
  },
});

// The dashboard connects an organization by messaging the extension.
if (config.cloudEnabled)
  chrome.runtime.onMessageExternal.addListener(
    createExternalListener({
      dashboardUrl: config.dashboardUrl,
      version: manifest.version_name ?? manifest.version,
      getConnection,
      storeAccount: (account: CloudAccount) =>
        Browser.storage.local.set({ [LocalDataKey.cloudAccount]: account }),
    }),
  );

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

  // Disconnect keeps the shared map: it only links to the cloud copies.
  const sharing = createSessionSharing({
    getConnection,
    loadSession: async (id) => {
      const events = await getEvents(id);
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
    putUnsent: putUnsentEvents,
    getUnsent: getUnsentEvents,
    deleteUnsent: deleteUnsentEvents,
    postEvents: (target, lines, onDelivered) =>
      uploadEvents(
        { ...target, apiUrl: config.apiUrl },
        lines,
        fetch,
        onDelivered,
      ),
    randomId: () => crypto.randomUUID(),
    openTab: (url) => Browser.tabs.create({ url }),
    now: () => Date.now(),
  });

  const sinkDeps = {
    addSession,
    uploadSession: (id: string, account: CloudAccount) =>
      sharing.uploadStopped(id, account),
    deleteSession: (id: string) => sharing.deleteSessions([id]),
    randomId: () => crypto.randomUUID(),
    getURL: (path: string) => Browser.runtime.getURL(path),
    recorderVersion: manifest.version_name || manifest.version,
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
    getConnection,
    getTabUrl: async (tabId) => (await Browser.tabs.get(tabId)).url,
    getTabTitle: async (tabId) => (await Browser.tabs.get(tabId)).title,
    getCurrentTabId: () => channel.getCurrentTabId(),
    injectRecorder,
    requestToTab: (tabId, service, params) =>
      channel.requestToTab(tabId, service, params),
    saveStatus: (status) =>
      Browser.storage.local.set({ [LocalDataKey.recorderStatus]: status }),
    openTab: (url) => Browser.tabs.create({ url }),
    onSessionsChanged: (change) =>
      channel.emit(EventName.SessionUpdated, change),
    createSink: (target) => createSink(target, sinkDeps),
    pingBrowser: () => Browser.runtime.getPlatformInfo(),
    after: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
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
  // The status is idle now, so no tab may still show a recording badge.
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

  return { recorder, sharing };
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
