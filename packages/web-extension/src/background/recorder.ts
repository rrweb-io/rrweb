import type { eventWithTime } from '@rrweb/types';
import { RecorderStatus, ServiceName } from '~/types';
import type {
  Connection,
  LocalData,
  LocalDataKey,
  RecordedEvent,
  RecordStoppedMessage,
  Session,
} from '~/types';
import { startRecording } from './sinks';
import type { RecordingSink, SinkTarget } from './sinks';

/** Chrome stops an idle MV3 service worker after about 30 s. */
export const KEEPALIVE_INTERVAL_MS = 25_000;
/** How long the page may take to confirm a start before it is given up. */
export const START_TIMEOUT_MS = 15_000;
export const START_TIMEOUT_ERROR =
  'The page did not start recording. Reload the tab and try again.';

type Status = LocalData[LocalDataKey.recorderStatus];

export type RecorderDeps = {
  /** Called with the status after every change, for the toolbar badge. */
  onStatus?: (status: Status) => void;
  getConnection: () => Promise<Connection>;
  getTabUrl: (tabId: number) => Promise<string | undefined>;
  getTabTitle: (tabId: number) => Promise<string | undefined>;
  getCurrentTabId: () => Promise<number>;
  /**
   * Load the recorder into the tab's top frame. Safe to call again for the
   * same document: the content script loads once and the page script once
   * per recording run.
   */
  injectRecorder: (tabId: number) => Promise<void>;
  requestToTab: (
    tabId: number,
    service: ServiceName,
    params: unknown,
  ) => Promise<unknown>;
  saveStatus: (status: Status) => Promise<void>;
  openTab: (url: string) => Promise<unknown>;
  onSessionUpdated: (session: Session) => void;
  createSink: (target: SinkTarget) => RecordingSink;
  /** Any extension API call; it resets Chrome's service worker idle timer. */
  pingBrowser: () => Promise<unknown>;
  /** Run `tick` every `ms` until the returned function is called. */
  every: (ms: number, tick: () => void) => () => void;
  /** Resolves after `ms`. */
  after: (ms: number) => Promise<void>;
  now: () => number;
  /** A fresh, unguessable token for each recording. */
  newToken: () => string;
};

/** What the popup shows when a cloud recording could not upload on Stop. */
export const uploadFailedMessage = (reason: string) =>
  `The recording did not upload (${reason}). It is saved in Offline sessions, where Share tries again.`;

/** Where an event came from, as the browser reports the message sender. */
export type EventSource = { tabId?: number; frameId?: number };

/**
 * The recording state machine: start, pause, resume and stop. One recording
 * is one tab: it starts in the current tab and stays there. When that tab's
 * document goes away (a navigation, a reload or the tab closing), the
 * recording finishes the same way Stop does. The sink lives for the whole
 * recording, so the account is read once at start and later account changes
 * are ignored. A cloud recording uploads when it finishes.
 */
export function createRecorder(deps: RecorderDeps) {
  // One sink per recording, so it also identifies the recording: an async step
  // captures it before its first await and changes nothing if it was replaced.
  let sink: RecordingSink | null = null;
  // The page emits Meta and FullSnapshot before the tab confirms the start,
  // and the sink does not exist until then. Hold them here, in order.
  let pendingEvents: eventWithTime[] = [];
  let status: Status = { status: RecorderStatus.IDLE, activeTabId: -1 };
  let stopKeepalive: () => void = () => undefined;
  // The recorded tab's title when the recording started; the session name if
  // the tab is gone by the time the recording finishes.
  let startTitle: string | undefined;
  // The recorded page went away while the start was still in flight.
  let goneWhileStarting = false;
  // Handed to the page script with every StartRecord and echoed on each
  // event, so events from an earlier recording's page are dropped.
  let token = 'no-recording';

  const save = () => {
    try {
      deps.onStatus?.(status);
    } catch (e) {
      console.warn('rrweb: status listener failed', e);
    }
    return deps.saveStatus(status);
  };

  /** `request` is the popup's message, checked by startRecording. */
  async function start(request: unknown) {
    if (status.status !== RecorderStatus.IDLE) return;
    // Claim the start before the first await, so a second click is ignored.
    status = { status: RecorderStatus.STARTING, activeTabId: -1 };
    sink = null; // drop any leftover sink before recording
    pendingEvents = [];
    goneWhileStarting = false;
    token = deps.newToken();
    try {
      await startClaimed(request);
    } finally {
      pendingEvents = []; // refused or failed starts must not leak events
      // Any path that did not reach RECORDING releases the claim.
      if (status.status === RecorderStatus.STARTING) {
        status = { ...status, status: RecorderStatus.IDLE, activeTabId: -1 };
        await save();
      }
    }
    if (goneWhileStarting && status.status === RecorderStatus.RECORDING)
      await finish({ pageGone: true });
  }

  async function startClaimed(request: unknown) {
    await save();
    const tabId = await deps.getCurrentTabId();
    if (tabId === -1) return;
    status.activeTabId = tabId;
    startTitle = await deps.getTabTitle(tabId).catch(() => undefined);

    const result = await startRecording({
      request,
      getConnection: deps.getConnection,
      getTabUrl: () => deps.getTabUrl(tabId),
      requestStart: async (config) => {
        await deps.injectRecorder(tabId);
        // A page script blocked by the site never confirms; without a limit
        // the start would hold the record button forever.
        const confirmed = deps.requestToTab(tabId, ServiceName.StartRecord, {
          config,
          token,
        }) as Promise<{ startTimestamp: number }>;
        const timedOut = deps
          .after(START_TIMEOUT_MS)
          .then(() => 'timed-out' as const);
        const first = await Promise.race([confirmed, timedOut]);
        if (first === 'timed-out') {
          void deps
            .requestToTab(tabId, ServiceName.StopRecord, {})
            .catch(() => undefined);
          throw new Error(START_TIMEOUT_ERROR);
        }
        return first;
      },
      requestStop: () => deps.requestToTab(tabId, ServiceName.StopRecord, {}),
      createSink: deps.createSink,
    });
    if (result.state !== 'started') {
      status = {
        status: RecorderStatus.IDLE,
        activeTabId: -1,
        errorMessage: result.errorMessage,
      };
      await save();
      return;
    }
    sink = result.sink;
    for (const pending of pendingEvents) sink.add(pending);
    pendingEvents = [];
    Object.assign(status, {
      status: RecorderStatus.RECORDING,
      activeTabId: tabId,
      startTimestamp: result.startTimestamp,
      kind: sink.kind,
      ...(sink.uploadsTo.name === 'organization'
        ? { uploadsTo: sink.uploadsTo.orgName }
        : {}),
    });
    // Keep the service worker, and with it the sink's events, alive while
    // recording, even when the page sends no events.
    stopKeepalive();
    stopKeepalive = deps.every(KEEPALIVE_INTERVAL_MS, () => {
      void deps.pingBrowser().catch(() => undefined);
    });
    await save();
  }

  /**
   * Stop, a navigation and a tab close can all ask to finish, even at once.
   * Whichever takes the sink first delivers it; the others leave the state
   * alone, including any recording started since.
   */
  async function finish({ pageGone }: { pageGone: boolean }) {
    // A start in flight finishes first; the popup disables the button meanwhile.
    if (
      status.status === RecorderStatus.IDLE ||
      status.status === RecorderStatus.STARTING
    )
      return;
    const finishingSink = sink;
    const tabId = status.activeTabId;
    // A document that is gone cannot be asked to stop, and events it sent
    // before going away have already arrived.
    if (!pageGone && status.status === RecorderStatus.RECORDING)
      await deps
        .requestToTab(tabId, ServiceName.StopRecord, {})
        .catch(() => undefined);
    const title =
      (pageGone
        ? undefined
        : await deps.getTabTitle(tabId).catch(() => undefined)) ??
      startTitle ??
      'new session';
    if (!finishingSink || sink !== finishingSink) return;
    sink = null;
    // The keepalive goes with the sink, until its events are stored and any
    // upload has settled: Chrome could stop the worker part way otherwise. A
    // recording started meanwhile gets its own.
    const stopFinishingKeepalive = stopKeepalive;
    stopKeepalive = () => undefined;
    try {
      status = { status: RecorderStatus.IDLE, activeTabId: -1 };
      const idle = status;
      await save();
      const result = await finishingSink.finish(title);
      if (result.state !== 'uploaded') deps.onSessionUpdated(result.session);
      // A recording started during the upload keeps its own status.
      if (result.state === 'upload-failed' && status === idle) {
        status.errorMessage = uploadFailedMessage(result.errorMessage);
        void save();
      }
      await deps.openTab(result.openUrl);
    } catch (e) {
      status.errorMessage = (e as { message: string }).message;
      void save();
    } finally {
      stopFinishingKeepalive();
    }
  }

  async function pause() {
    const pausing = sink;
    const stopResponse = (await deps
      .requestToTab(status.activeTabId, ServiceName.StopRecord, {})
      .catch(() => undefined)) as RecordStoppedMessage | undefined;
    if (sink !== pausing) return; // the recording finished meanwhile
    Object.assign(status, {
      status: RecorderStatus.PAUSED,
      pausedTimestamp: stopResponse?.endTimestamp,
    });
    await save();
  }

  /** Continue in the recorded tab, whichever tab is current now. */
  async function resume() {
    const tabId = status.activeTabId;
    const { startTimestamp, pausedTimestamp } = status;
    const pausedTime = pausedTimestamp ? deps.now() - pausedTimestamp : 0;
    // Decrease the time spent in the pause state and make the recording look
    // continuous.
    sink?.shiftEvents(pausedTime);
    const startResponse = await deps
      .injectRecorder(tabId)
      .then(() =>
        deps.requestToTab(tabId, ServiceName.StartRecord, {
          config: sink?.recordConfig ?? {},
          token,
        }),
      )
      .catch((e: { message: string }) => {
        status.errorMessage = e.message;
        void save();
      });
    if (!startResponse || status.status !== RecorderStatus.PAUSED) {
      // Restore the events data when the recording fails to start.
      sink?.shiftEvents(-pausedTime);
      return;
    }
    status = {
      status: RecorderStatus.RECORDING,
      activeTabId: tabId,
      startTimestamp: (startTimestamp || deps.now()) + pausedTime,
      kind: status.kind,
      uploadsTo: status.uploadsTo,
    };
    await save();
  }

  return {
    getStatus: () => status,
    start,
    stop: () => finish({ pageGone: false }),
    async pauseClicked() {
      if (status.status !== RecorderStatus.RECORDING) return;
      await pause();
    },
    async resumeClicked() {
      if (status.status !== RecorderStatus.PAUSED) return;
      status.errorMessage = undefined;
      await save();
      await resume();
    },
    /**
     * An event from a page script. Only the recorded tab's top frame, running
     * this recording, may add to it; anything else is dropped.
     */
    add(message: RecordedEvent, from: EventSource) {
      if (
        status.status === RecorderStatus.IDLE ||
        from.tabId !== status.activeTabId ||
        from.frameId !== 0 ||
        message.token !== token
      )
        return;
      if (status.status === RecorderStatus.STARTING)
        pendingEvents.push(message.event);
      else sink?.add(message.event);
    },
    /**
     * The top-frame document of `tabId` went away, or the tab closed. If that
     * is the recorded tab, finish the recording as Stop does.
     */
    async pageGone(tabId: number) {
      if (tabId === -1 || tabId !== status.activeTabId) return;
      if (status.status === RecorderStatus.STARTING) {
        goneWhileStarting = true;
        return;
      }
      await finish({ pageGone: true });
    },
  };
}
