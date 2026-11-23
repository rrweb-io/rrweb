import type { eventWithTime } from '@rrweb/types';
import { ServiceName } from '~/types';
import type {
  Connection,
  LastError,
  RecordedEvent,
  RecorderStatus,
  RecordStoppedMessage,
  SessionsChange,
} from '~/types';
import { startRecording } from './sinks';
import type { RecordingSink, SinkTarget } from './sinks';

/** Chrome stops an idle MV3 service worker after about 30 s. */
export const KEEPALIVE_INTERVAL_MS = 25_000;
/** How long the page may take to confirm a start before it is given up. */
export const START_TIMEOUT_MS = 15_000;
export const START_TIMEOUT_ERROR =
  'The page did not start recording. Reload the tab and try again.';
/**
 * How long a navigation may take to load the next page before the recording
 * finishes without it.
 */
export const NAVIGATION_TIMEOUT_MS = 30_000;

export type RecorderDeps = {
  /** Called with the status after every change, for the toolbar badge. */
  onStatus: (status: RecorderStatus) => void;
  getConnection: () => Promise<Connection>;
  getTabUrl: (tabId: number) => Promise<string | undefined>;
  getTabTitle: (tabId: number) => Promise<string | undefined>;
  /** The tab's load status, such as 'loading' or 'complete'. */
  getTabStatus: (tabId: number) => Promise<string | undefined>;
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
  saveStatus: (status: RecorderStatus) => Promise<void>;
  openTab: (url: string) => Promise<unknown>;
  onSessionsChanged: (change: SessionsChange) => void;
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

/** One recording, from the tab's confirmed start until it finishes. */
type Recording = {
  tabId: number;
  /**
   * Handed to the page script with every StartRecord and echoed on each
   * event, so events from an earlier recording's page are dropped.
   */
  token: string;
  sink: RecordingSink;
  /**
   * The tab's title when the recording started, or 'new session' if it had
   * none: the session name if the tab is gone by the time it finishes.
   */
  startTitle: string;
  /**
   * Ends the keepalive. It runs until the recording's events are stored and
   * any upload has settled: Chrome could stop the worker part way otherwise.
   */
  stopKeepalive: () => void;
};

/**
 * Where the recorder is, with exactly the data of that state. The status the
 * popup and badge see is derived from it.
 * finding-tab: a start is claimed and the current tab is being looked up.
 * starting: `tabId` is asked to record. The page emits Meta and FullSnapshot
 * before it confirms, so they are held in order until the sink exists.
 * `pageGone` records that the page went away meanwhile.
 * recording, pausing, paused, resuming: `recording` runs. pausing waits for
 * the page to stop, since the click at `clickedAt`; resuming waits for it to
 * record again; `pageGone` records that the page went away meanwhile, since
 * its reply and its port can arrive in either order.
 * navigating: the recorded document went away while recording, and the tab
 * is loading the next one. reattaching: the next document loaded, and the
 * recorder is injected into it to record under the same token.
 * finishing: a finish took the recording. It still accepts the page's last
 * events, and nothing else can take or follow the recording any more.
 * Each in-flight step owns its phase object, so its reply is applied only
 * while the phase is still that object, and a second click meanwhile does
 * nothing.
 */
type Phase =
  | { name: 'idle'; lastError: LastError }
  | { name: 'finding-tab' }
  | {
      name: 'starting';
      tabId: number;
      token: string;
      held: eventWithTime[];
      pageGone: boolean;
    }
  | { name: 'recording'; recording: Recording; startTimestamp: number }
  | {
      name: 'pausing';
      recording: Recording;
      startTimestamp: number;
      clickedAt: number;
    }
  | {
      name: 'paused';
      recording: Recording;
      startTimestamp: number;
      pausedTimestamp: number;
      lastError: LastError;
    }
  | {
      name: 'resuming';
      recording: Recording;
      startTimestamp: number;
      pausedTimestamp: number;
      pageGone: boolean;
    }
  | { name: 'navigating'; recording: Recording; startTimestamp: number }
  | { name: 'reattaching'; recording: Recording; startTimestamp: number }
  | { name: 'finishing'; of: Running };

/** A phase with a recording in it that is still running. */
type Running = Extract<Phase, { recording: Recording }>;
const isRunningPhase = (phase: Phase): phase is Running => 'recording' in phase;

/** How a start ended, for the finish a departed page asks for. */
type StartOutcome =
  | { name: 'not-started' }
  | { name: 'started'; recording: Recording; pageGone: boolean };

/**
 * How a request to record again, on resume or after a navigation, ended.
 * abandoned: the phase moved on before StartRecord was sent, so the page was
 * never asked to record under its token again.
 */
type RecordAgainAnswer =
  | { name: 'started' }
  | { name: 'no-answer' }
  | { name: 'failed'; message: string }
  | { name: 'abandoned' };

const NO_ERROR: LastError = { name: 'none' };
const failed = (message: string): LastError => ({ name: 'failed', message });

/**
 * pausing, navigating and reattaching still show as recording, and resuming
 * as paused: the popup keeps its controls, and the in-flight phase ignores
 * their clicks.
 */
function statusOf(phase: Phase): RecorderStatus {
  switch (phase.name) {
    case 'finishing':
      // Shown as it was until the recording is stored.
      return statusOf(phase.of);
    case 'idle':
      return { state: 'idle', lastError: phase.lastError };
    case 'finding-tab':
    case 'starting':
      return { state: 'starting' };
    case 'recording':
    case 'pausing':
    case 'navigating':
    case 'reattaching':
      return {
        state: 'recording',
        tabId: phase.recording.tabId,
        startTimestamp: phase.startTimestamp,
        destination: phase.recording.sink.destination,
      };
    case 'paused':
    case 'resuming':
      return {
        state: 'paused',
        tabId: phase.recording.tabId,
        startTimestamp: phase.startTimestamp,
        pausedTimestamp: phase.pausedTimestamp,
        destination: phase.recording.sink.destination,
        lastError: phase.name === 'paused' ? phase.lastError : NO_ERROR,
      };
  }
}

/**
 * The recording state machine: start, pause, resume and stop. One recording
 * is one tab: it starts in the current tab and stays there. A reload or a
 * navigation within the site is followed: the next page is recorded under the
 * same token, starting with its own FullSnapshot. The browser decides which
 * pages that is. Chrome keeps `activeTab` access within the origin the record
 * click granted, and Firefox drops it on any navigation; where the injection
 * is refused, the recording finishes the same way Stop does. Closing the tab
 * finishes it too. The sink lives for the whole recording, so the account is
 * read once at start and later account changes are ignored. A cloud
 * recording uploads when it finishes.
 */
export function createRecorder(deps: RecorderDeps) {
  let phase: Phase = { name: 'idle', lastError: NO_ERROR };

  /** Whether `recording` is the one running now, in any running phase. */
  const isCurrent = (recording: Recording) =>
    isRunningPhase(phase) && phase.recording === recording;

  const save = () => {
    const status = statusOf(phase);
    try {
      deps.onStatus(status);
    } catch (e) {
      console.warn('rrweb: status listener failed', e);
    }
    return deps.saveStatus(status);
  };

  /** `request` is the popup's message, checked by startRecording. */
  async function start(request: unknown) {
    if (phase.name !== 'idle') return;
    // Claim the start before the first await, so a second click is ignored.
    const claim: Phase = { name: 'finding-tab' };
    phase = claim;
    // The phase this start owns; a newer start's is never touched.
    let owned: Phase = claim;
    let outcome: StartOutcome = { name: 'not-started' };
    try {
      outcome = await startClaimed(request, (starting) => {
        phase = owned = starting;
      });
    } finally {
      // Any path that did not reach recording releases the claim, and refused
      // or failed starts drop the events they held.
      if (phase === owned && statusOf(phase).state === 'starting') {
        phase = { name: 'idle', lastError: NO_ERROR };
        await save();
      }
    }
    // The page went away before the tab confirmed: finish as Stop does,
    // unless the recording already finished another way.
    if (outcome.name === 'started' && outcome.pageGone)
      if (isCurrent(outcome.recording)) await finish({ pageGone: true });
  }

  async function startClaimed(
    request: unknown,
    claim: (starting: Extract<Phase, { name: 'starting' }>) => void,
  ): Promise<StartOutcome> {
    await save();
    const tabId = await deps.getCurrentTabId();
    if (tabId === -1) return { name: 'not-started' }; // no current tab
    const starting = {
      name: 'starting' as const,
      tabId,
      token: deps.newToken(),
      held: [] as eventWithTime[],
      pageGone: false,
    };
    claim(starting);
    const startTitle =
      (await deps.getTabTitle(tabId).catch(() => undefined)) ?? 'new session';

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
          token: starting.token,
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
      createSink: deps.createSink,
    });
    if (result.state === 'refused') {
      phase = { name: 'idle', lastError: failed(result.errorMessage) };
      await save();
      return { name: 'not-started' };
    }
    const recording: Recording = {
      tabId,
      token: starting.token,
      sink: result.sink,
      startTitle,
      // Keep the service worker, and with it the sink's events, alive while
      // recording, even when the page sends no events.
      stopKeepalive: deps.every(KEEPALIVE_INTERVAL_MS, () => {
        void deps.pingBrowser().catch(() => undefined);
      }),
    };
    for (const held of starting.held) recording.sink.add(held);
    phase = {
      name: 'recording',
      recording,
      startTimestamp: result.startTimestamp,
    };
    await save();
    return { name: 'started', recording, pageGone: starting.pageGone };
  }

  /**
   * Stop, a navigation and a tab close can all ask to finish, even at once.
   * Whichever takes the recording first delivers it; the others leave the
   * state alone, including any recording started since.
   */
  async function finish({ pageGone }: { pageGone: boolean }) {
    // A start in flight finishes first; the popup disables the button meanwhile.
    if (!isRunningPhase(phase)) return;
    const running = phase;
    const { recording } = running;
    // Claimed before any await: a later finish, navigation or load finds the
    // recording taken, and a resume or next page still starting sees that it
    // lost the recording and stops its page itself.
    phase = { name: 'finishing', of: running };
    // A document that is gone cannot be asked to stop, and events it sent
    // before going away have already arrived. A paused page is not recording,
    // and neither is one the recorder is still being injected into.
    if (
      !pageGone &&
      (running.name === 'recording' || running.name === 'pausing')
    )
      await deps
        .requestToTab(recording.tabId, ServiceName.StopRecord, {})
        .catch(() => undefined);
    const title =
      (pageGone
        ? undefined
        : await deps.getTabTitle(recording.tabId).catch(() => undefined)) ??
      recording.startTitle;
    let idle: Phase = { name: 'idle', lastError: NO_ERROR };
    phase = idle;
    /** A recording started meanwhile keeps its own status. */
    const report = (message: string) => {
      if (phase !== idle) return;
      phase = idle = { name: 'idle', lastError: failed(message) };
      void save();
    };
    try {
      await save();
      const result = await recording.sink.finish(title);
      // An uploaded recording's local copy is gone, so open lists drop it.
      deps.onSessionsChanged(
        result.state === 'uploaded'
          ? { name: 'removed' }
          : { name: 'saved', session: result.session },
      );
      if (result.state === 'upload-failed')
        report(uploadFailedMessage(result.errorMessage));
      await deps.openTab(result.openUrl);
    } catch (e) {
      report((e as { message: string }).message);
    } finally {
      recording.stopKeepalive();
    }
  }

  async function pause() {
    if (phase.name === 'navigating' || phase.name === 'reattaching') {
      // No page records while the next one loads, so the pause is immediate.
      // A next page still starting sees it lost the recording and stops.
      phase = {
        name: 'paused',
        recording: phase.recording,
        startTimestamp: phase.startTimestamp,
        pausedTimestamp: deps.now(),
        lastError: NO_ERROR,
      };
      await save();
      return;
    }
    if (phase.name !== 'recording') return;
    const pausing: Phase = {
      name: 'pausing',
      recording: phase.recording,
      startTimestamp: phase.startTimestamp,
      // A page that does not answer stopped no later than the click.
      clickedAt: deps.now(),
    };
    phase = pausing;
    const { recording, clickedAt } = pausing;
    const pausedTimestamp = await deps
      .requestToTab(recording.tabId, ServiceName.StopRecord, {})
      .then(
        (reply) =>
          (reply as RecordStoppedMessage | undefined)?.endTimestamp ??
          clickedAt,
        () => clickedAt,
      );
    if (phase !== pausing) return; // the recording finished meanwhile
    phase = {
      name: 'paused',
      recording,
      startTimestamp: pausing.startTimestamp,
      pausedTimestamp,
      lastError: NO_ERROR,
    };
    await save();
  }

  /** Whether a start or recording newer than any finished one is in `tabId`. */
  const holdsTab = (tabId: number) =>
    phase.name === 'starting'
      ? phase.tabId === tabId
      : isRunningPhase(phase) && phase.recording.tabId === tabId;

  /**
   * Load the page script again and ask it to record under the same token,
   * while `owner` is the phase.
   */
  async function recordAgain(owner: Running): Promise<RecordAgainAnswer> {
    const { recording } = owner;
    try {
      await deps.injectRecorder(recording.tabId);
      // Stopped while injecting: the page must not record under this token.
      if (phase !== owner) return { name: 'abandoned' };
      const reply = await deps.requestToTab(
        recording.tabId,
        ServiceName.StartRecord,
        { config: recording.sink.recordConfig, token: recording.token },
      );
      return reply ? { name: 'started' } : { name: 'no-answer' };
    } catch (e) {
      return { name: 'failed', message: (e as { message: string }).message };
    }
  }

  /** Continue in the recorded tab, whichever tab is current now. */
  async function resume() {
    if (phase.name !== 'paused') return;
    const resuming: Phase = {
      name: 'resuming',
      recording: phase.recording,
      startTimestamp: phase.startTimestamp,
      pausedTimestamp: phase.pausedTimestamp,
      pageGone: false,
    };
    phase = resuming;
    await save(); // clears the last resume's error
    if (phase !== resuming) return; // the recording finished meanwhile
    const { recording } = resuming;
    const pausedTime = deps.now() - resuming.pausedTimestamp;
    // Decrease the time spent in the pause state and make the recording look
    // continuous.
    recording.sink.shiftEvents(pausedTime);
    // The page the resume injects into is the one the tab has now, so only a
    // page leaving from here on is followed.
    resuming.pageGone = false;
    const answer = await recordAgain(resuming);
    if (answer.name !== 'started' || phase !== resuming)
      // Restore the events data when the recording did not start again.
      recording.sink.shiftEvents(-pausedTime);
    if (phase !== resuming) {
      // The recording finished while the page was asked to record again. A
      // page that did start must stop, unless a newer recording took its tab:
      // its StartRecord replaced this one in the page.
      if (
        (answer.name === 'started' || answer.name === 'no-answer') &&
        !holdsTab(recording.tabId)
      )
        void deps
          .requestToTab(recording.tabId, ServiceName.StopRecord, {})
          .catch(() => undefined);
      return;
    }
    if (answer.name !== 'started') {
      phase = {
        name: 'paused',
        recording,
        startTimestamp: resuming.startTimestamp,
        pausedTimestamp: resuming.pausedTimestamp,
        lastError: answer.name === 'failed' ? answer : NO_ERROR,
      };
      await save();
      return;
    }
    const recordingPhase: Running = {
      name: 'recording',
      recording,
      startTimestamp: resuming.startTimestamp + pausedTime,
    };
    // The page that confirmed is already gone: follow the tab to its next one.
    if (resuming.pageGone) navigate(recordingPhase);
    else phase = recordingPhase;
    await save();
  }

  /**
   * The recorded document went away. Wait for the tab to load the next one,
   * and finish the recording if it does not in time.
   */
  function navigate(running: Running) {
    const navigating: Phase = {
      name: 'navigating',
      recording: running.recording,
      startTimestamp: running.startTimestamp,
    };
    phase = navigating;
    void deps.after(NAVIGATION_TIMEOUT_MS).then(async () => {
      if (phase === navigating) await finish({ pageGone: true });
    });
    // The next page may have loaded already: its load event and the old
    // page's port can arrive in either order, and a resume waiting on its
    // reply ignores loads.
    void deps
      .getTabStatus(navigating.recording.tabId)
      .then(async (status) => {
        if (status === 'complete' && phase === navigating)
          await reattach(navigating);
      })
      .catch(() => undefined);
  }

  /** Record the document the tab loaded after a navigation. */
  async function reattach(navigating: Extract<Phase, { name: 'navigating' }>) {
    const reattaching: Phase = { ...navigating, name: 'reattaching' };
    phase = reattaching;
    const { recording } = reattaching;
    // A page script blocked by the site never confirms, as on start.
    const answer = await Promise.race([
      recordAgain(reattaching),
      deps.after(START_TIMEOUT_MS).then(() => ({ name: 'no-answer' } as const)),
    ]);
    if (phase !== reattaching) {
      // Stopped, paused, closed or navigated again meanwhile. A page that did
      // or may still start must stop, unless a newer page or recording has
      // taken the tab: its StartRecord replaced this one in the page.
      // Read afresh: the awaits above let any phase in.
      const now = phase as Phase;
      const replaced =
        now.name === 'navigating' ||
        now.name === 'reattaching' ||
        (holdsTab(recording.tabId) &&
          !(isRunningPhase(now) && now.recording === recording));
      if (
        (answer.name === 'started' || answer.name === 'no-answer') &&
        !replaced
      )
        void deps
          .requestToTab(recording.tabId, ServiceName.StopRecord, {})
          .catch(() => undefined);
      return;
    }
    if (answer.name === 'started') {
      phase = { ...reattaching, name: 'recording' };
      // Saved again, which sets the badge on the new page too.
      await save();
      return;
    }
    if (answer.name === 'no-answer')
      void deps
        .requestToTab(recording.tabId, ServiceName.StopRecord, {})
        .catch(() => undefined);
    // A tab loading again was navigated before this page took the recorder,
    // which interrupts the injection: wait for that load instead.
    const status = await deps
      .getTabStatus(recording.tabId)
      .catch(() => undefined);
    if (phase !== reattaching) return;
    if (status === 'loading') return navigate(reattaching);
    // The browser refused the injection (another site, or Firefox after any
    // navigation), or the page never answered: finish with what was recorded.
    await finish({ pageGone: true });
  }

  return {
    getStatus: () => statusOf(phase),
    start,
    stop: () => finish({ pageGone: false }),
    pauseClicked: pause,
    resumeClicked: resume,
    /**
     * An event from a page script. Only the recorded tab's top frame, running
     * this recording, may add to it; anything else is dropped.
     */
    add(message: RecordedEvent, from: EventSource) {
      const accepts = (owner: { tabId: number; token: string }) =>
        from.tabId === owner.tabId &&
        from.frameId === 0 &&
        message.token === owner.token;
      if (phase.name === 'starting') {
        if (accepts(phase)) phase.held.push(message.event);
      } else if (isRunningPhase(phase)) {
        if (accepts(phase.recording)) phase.recording.sink.add(message.event);
      } else if (phase.name === 'finishing') {
        // The page's last events, sent before it answers StopRecord.
        const { recording } = phase.of;
        if (accepts(recording)) recording.sink.add(message.event);
      }
    },
    /**
     * The recorded top-frame document of `tabId` went away. A recording
     * follows the tab to its next document; a paused one stays paused, and
     * resume records the document the tab has then.
     */
    documentGone(tabId: number) {
      if (phase.name === 'starting') {
        // The start finishes the recording once the tab confirms it.
        if (tabId === phase.tabId) phase.pageGone = true;
      } else if (phase.name === 'resuming') {
        // A resume the page confirms follows the tab instead.
        if (tabId === phase.recording.tabId) phase.pageGone = true;
      } else if (
        (phase.name === 'recording' ||
          phase.name === 'navigating' ||
          phase.name === 'reattaching') &&
        tabId === phase.recording.tabId
      )
        // Gone again before it was recorded, as in a redirect: wait anew.
        navigate(phase);
    },
    /**
     * `tabId` loaded a document. Record it if the recording is waiting; a
     * paused recording saves its status again, since Firefox clears a tab's
     * badge when it loads a new page.
     */
    async documentLoaded(tabId: number) {
      if (phase.name === 'navigating' && tabId === phase.recording.tabId)
        await reattach(phase);
      else if (phase.name === 'paused' && tabId === phase.recording.tabId)
        await save();
    },
    /** The tab closed: finish its recording as Stop does. */
    async tabClosed(tabId: number) {
      if (phase.name === 'starting') {
        if (tabId === phase.tabId) phase.pageGone = true;
      } else if (isRunningPhase(phase) && tabId === phase.recording.tabId)
        await finish({ pageGone: true });
    },
  };
}
