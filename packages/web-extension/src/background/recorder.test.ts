import { describe, expect, it, vi } from 'vitest';
import type { eventWithTime } from '@rrweb/types';
import {
  createRecorder,
  KEEPALIVE_INTERVAL_MS,
  START_TIMEOUT_ERROR,
  uploadFailedMessage,
} from './recorder';
import { createBadge, BADGE_COLORS } from './badge';
import type { RecorderDeps } from './recorder';
import { ACCOUNT_CHANGED_ERROR, createSink } from './sinks';
import type { SinkTarget } from './sinks';
import { watchRecordedPages, RECORDED_PAGE_PORT } from './pageWatch';
import { ServiceName } from '~/types';
import type {
  CloudAccount,
  RecorderStatus,
  Session,
  ShareResult,
  StartRequest,
} from '~/types';

const account: CloudAccount = {
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};
const event = (timestamp: number) => ({ timestamp } as eventWithTime);
const typed = (type: number, timestamp: number) =>
  ({ type, timestamp } as eventWithTime);

const recordingIn = (
  tabId: number,
): Extract<RecorderStatus, { state: 'recording' }> => ({
  state: 'recording',
  tabId,
  startTimestamp: 1,
  destination: { name: 'stored-only' },
});

const SESSION_URL = 'chrome-extension://abc/pages/index.html#/session/sess-1';
const DASHBOARD_URL = 'https://app.rrweb.com/recordings/rec-1';
const SHARED: ShareResult = { name: 'shared', recordingId: 'rec-1' };

function setup(initial: CloudAccount | null) {
  const addSession = vi.fn((_session: Session, _events: eventWithTime[]) =>
    Promise.resolve(),
  );
  const uploadSession = vi.fn(
    (_sessionId: string, _account: CloudAccount): Promise<ShareResult> =>
      Promise.resolve(SHARED),
  );
  const deleteSession = vi.fn((_sessionId: string) => Promise.resolve());
  const sinkDeps = {
    addSession,
    uploadSession,
    deleteSession,
    randomId: () => 'sess-1',
    getURL: (path: string) => `chrome-extension://abc${path}`,
    recorderVersion: '2.2.2',
  };
  /** Every sink the recorder made, and every event it was given. */
  const sinks: SinkTarget[] = [];
  const added = vi.fn((sent: eventWithTime) => void sent);
  const state = {
    account: initial,
    now: 1000,
    refuse: false,
    currentTab: 1,
    /** Resolves when the tab answers StopRecord; immediately if unset. */
    stopReply: undefined as Promise<void> | undefined,
    /** The page never confirms StartRecord, and the start limit runs out. */
    startHangs: false,
    /** Resolves when the tab confirms StartRecord; immediately if unset. */
    startReply: undefined as Promise<void> | undefined,
    /** The next save of this state waits for `until`; then it is used up. */
    holdSave: undefined as
      | { state: RecorderStatus['state']; until: Promise<void> }
      | undefined,
    /** Every `after(ms)` the recorder asked for, in milliseconds. */
    waits: [] as number[],
    titles: { 1: 'Page title' } as Record<number, string | undefined>,
    /** Runs inside the tab's StartRecord reply, like rrweb's first events. */
    emitOnStart: undefined as (() => void) | undefined,
    tabs: { 1: 'https://example.com/a', 2: 'https://example.org/b' } as Record<
      number,
      string
    >,
    /** The tab and token of the last StartRecord: where the page records. */
    page: { tabId: -1, token: 'no-start-yet' },
    tokens: 0,
  };
  /** Calls in order, to check that injection comes before the start request. */
  const log: string[] = [];
  const injectRecorder = vi.fn((tabId: number) => {
    log.push(`inject:${tabId}`);
    return Promise.resolve();
  });
  const requestToTab = vi.fn(
    (tabId: number, service: ServiceName, params?: unknown) => {
      log.push(`${service}:${tabId}`);
      if (service === ServiceName.StartRecord) {
        state.page = { tabId, token: (params as { token: string }).token };
        state.emitOnStart?.();
      }
      if (state.refuse) return Promise.reject(new Error('cannot record here'));
      if (state.startHangs && service === ServiceName.StartRecord)
        return new Promise(() => undefined);
      if (service === ServiceName.StopRecord)
        return (state.stopReply ?? Promise.resolve()).then(() => ({
          endTimestamp: state.now,
        }));
      if (state.startReply)
        return state.startReply.then(() => ({ startTimestamp: state.now }));
      return Promise.resolve({ startTimestamp: state.now });
    },
  );
  const opened: string[] = [];
  const saved: RecorderStatus['state'][] = [];
  const keepalive = {
    ms: 0,
    ticks: [] as (() => void)[],
    cancel: vi.fn((index: number) => void index),
    ping: vi.fn(() => Promise.resolve()),
  };
  const badgeCalls: string[] = [];
  const badgeFailure = { set: false };
  const badge = createBadge({
    setBadge: (tabId, { text, color }) => {
      badgeCalls.push(`set:${tabId}:${text}:${color}`);
      if (badgeFailure.set) return Promise.reject(new Error('badge broke'));
      return Promise.resolve();
    },
    clearBadge: (tabId) => {
      badgeCalls.push(`clear:${tabId}`);
      return Promise.resolve();
    },
  });
  const deps: RecorderDeps = {
    onStatus: badge.sync,
    getConnection: () =>
      Promise.resolve(
        state.account
          ? { name: 'connected', account: state.account }
          : { name: 'not-connected' },
      ),
    getTabUrl: (tabId) => Promise.resolve(state.tabs[tabId]),
    getCurrentTabId: () => Promise.resolve(state.currentTab),
    injectRecorder,
    requestToTab,
    saveStatus: (s) => {
      saved.push(s.state);
      const hold = state.holdSave;
      if (hold?.state !== s.state) return Promise.resolve();
      state.holdSave = undefined;
      return hold.until;
    },
    getTabTitle: (tabId) => Promise.resolve(state.titles[tabId]),
    openTab: (url) => {
      opened.push(url);
      return Promise.resolve();
    },
    onSessionsChanged: vi.fn(),
    createSink: (target) => {
      sinks.push(target);
      const sink = createSink(target, sinkDeps);
      const add = sink.add;
      sink.add = (e) => {
        added(e);
        add(e);
      };
      return sink;
    },
    pingBrowser: keepalive.ping,
    every: (ms, tick) => {
      keepalive.ms = ms;
      // cancel is called with the index of the registration it stops
      const index = keepalive.ticks.push(tick) - 1;
      return () => keepalive.cancel(index);
    },
    now: () => state.now,
    newToken: () => `token-${++state.tokens}`,
    // The start limit runs out only in tests that make the page hang.
    after: (ms) => {
      state.waits.push(ms);
      return state.startHangs
        ? Promise.resolve()
        : new Promise(() => undefined);
    },
  };
  const real = createRecorder(deps);
  /**
   * By default the popup asks for the destination it would show for the
   * current account, and events come from the page last asked to record,
   * with the token it was given.
   */
  const recorder = {
    ...real,
    start: (
      request: StartRequest = state.account
        ? { mode: 'cloud', orgId: state.account.orgId }
        : { mode: 'offline' },
    ) => real.start(request),
    add: (
      e: eventWithTime,
      from: { tabId?: number; frameId?: number; token?: string } = {},
    ) =>
      real.add(
        { event: e, token: from.token ?? state.page.token },
        {
          tabId: 'tabId' in from ? from.tabId : state.page.tabId,
          frameId: 'frameId' in from ? from.frameId : 0,
        },
      ),
  };
  // The browser side of the page watch: one port per recorded document.
  const connectListeners: ((port: never) => void)[] = [];
  const removedListeners: ((tabId: number) => void)[] = [];
  watchRecordedPages(
    {
      onConnect: { addListener: (cb) => connectListeners.push(cb as never) },
      onTabRemoved: { addListener: (cb) => removedListeners.push(cb) },
    },
    (tabId) => void recorder.pageGone(tabId),
  );
  const browser = {
    /** A content script in `tabId` opens its page port. */
    openPage(tabId: number, frameId = 0) {
      const disconnects: (() => void)[] = [];
      const port = {
        name: RECORDED_PAGE_PORT,
        sender: { tab: { id: tabId }, frameId },
        onDisconnect: { addListener: (cb: () => void) => disconnects.push(cb) },
      };
      connectListeners.forEach((cb) => cb(port as never));
      /** The document went away: a navigation, a reload or the tab closing. */
      return () => disconnects.forEach((cb) => cb());
    },
    closeTab(tabId: number) {
      removedListeners.forEach((cb) => cb(tabId));
    },
  };
  /** Let the finish triggered by a browser event run to completion. */
  const settle = () => new Promise((r) => setTimeout(r, 0));
  return {
    recorder,
    browser,
    settle,
    log,
    injectRecorder,
    state,
    sinks,
    added,
    addSession,
    uploadSession,
    deleteSession,
    onSessionsChanged: deps.onSessionsChanged as ReturnType<typeof vi.fn>,
    opened,
    keepalive,
    requestToTab,
    saved,
    badgeCalls,
    badgeFailure,
  };
}

describe('createRecorder', () => {
  it('injects the recorder into the current tab on start', async () => {
    const { recorder, log, injectRecorder, state } = setup(account);
    state.currentTab = 2;
    state.tabs[2] = 'https://example.org/b';
    await recorder.start();
    expect(injectRecorder).toHaveBeenCalledOnce();
    expect(injectRecorder).toHaveBeenCalledWith(2);
    expect(log).toEqual(['inject:2', `${ServiceName.StartRecord}:2`]);
    expect(recorder.getStatus()).toMatchObject({
      state: 'recording',
      tabId: 2,
    });
  });

  it('gives up a start the page never confirms, and frees the record button', async () => {
    const { recorder, state, requestToTab, sinks, keepalive } = setup(account);
    state.startHangs = true;
    await recorder.start();
    // The page gets 15 seconds to confirm.
    expect(state.waits).toEqual([15_000]);
    expect(sinks).toEqual([]);
    expect(keepalive.ticks).toHaveLength(0);
    expect(recorder.getStatus()).toMatchObject({
      state: 'idle',
      lastError: { name: 'failed', message: START_TIMEOUT_ERROR },
    });
    // the page is told to stop in case it starts late
    expect(
      requestToTab.mock.calls.some((c) => c[1] === ServiceName.StopRecord),
    ).toBe(true);
    state.startHangs = false;
    await recorder.start();
    expect(recorder.getStatus().state).toBe('recording');
  });

  it('keeps the organization a cloud recording started with in its status', async () => {
    const cloudRun = setup(account);
    await cloudRun.recorder.start();
    expect(cloudRun.recorder.getStatus()).toMatchObject({
      destination: { name: 'organization', orgName: 'Acme' },
    });
    const offlineRun = setup(null);
    await offlineRun.recorder.start();
    expect(offlineRun.recorder.getStatus()).toMatchObject({
      destination: { name: 'stored-only' },
    });
  });

  it('starts nothing and reports the error when the tab cannot be injected', async () => {
    const { recorder, injectRecorder, requestToTab, sinks, keepalive } =
      setup(account);
    injectRecorder.mockRejectedValueOnce(new Error('Cannot access this page'));
    await recorder.start();
    expect(requestToTab).not.toHaveBeenCalled();
    expect(sinks).toEqual([]);
    expect(keepalive.ticks).toHaveLength(0);
    expect(recorder.getStatus()).toMatchObject({
      state: 'idle',
      lastError: { name: 'failed', message: 'Cannot access this page' },
    });
    // the next start on a page that can be recorded works
    await recorder.start();
    expect(recorder.getStatus().state).toBe('recording');
  });

  it('does not move the recording when another tab activates', async () => {
    const { recorder, state, added, browser, settle, log, opened } =
      setup(account);
    browser.openPage(1);
    await recorder.start();
    recorder.add(event(1));
    // the person switches to tab 2, which has its own page port
    state.currentTab = 2;
    const leaveTab2 = browser.openPage(2);
    await recorder.pauseClicked();
    await recorder.resumeClicked();
    recorder.add(event(2));
    // tab 2 navigating or closing is not the recording's business
    leaveTab2();
    browser.closeTab(2);
    await settle();
    expect(log.filter((l) => l.endsWith(':2'))).toEqual([]);
    expect(recorder.getStatus()).toMatchObject({
      state: 'recording',
      tabId: 1,
    });
    expect(added.mock.calls.map((c) => c[0].timestamp)).toEqual([1, 2]);
    expect(opened).toEqual([]);
  });

  it('finishes like Stop when the recorded tab navigates (cloud)', async () => {
    const {
      recorder,
      added,
      uploadSession,
      browser,
      settle,
      opened,
      keepalive,
      requestToTab,
    } = setup(account);
    const navigateAway = browser.openPage(1);
    await recorder.start();
    recorder.add(event(1));
    navigateAway();
    await settle();
    expect(added).toHaveBeenCalledOnce();
    expect(uploadSession).toHaveBeenCalledWith('sess-1', account);
    expect(opened).toEqual([DASHBOARD_URL]);
    expect(keepalive.cancel).toHaveBeenCalledOnce();
    expect(recorder.getStatus().state).toBe('idle');
    // the old document is gone, so nothing is asked of it
    expect(
      requestToTab.mock.calls.filter((c) => c[1] === ServiceName.StopRecord),
    ).toHaveLength(0);
  });

  it('finishes like Stop when the recorded tab navigates (offline)', async () => {
    const { recorder, browser, settle, opened, addSession, keepalive } =
      setup(null);
    const navigateAway = browser.openPage(1);
    await recorder.start();
    recorder.add(event(1));
    navigateAway();
    await settle();
    expect(addSession).toHaveBeenCalledOnce();
    const [session, events] = addSession.mock.calls[0] as unknown as [
      { name: string },
      eventWithTime[],
    ];
    expect(session.name).toBe('Page title');
    expect(events).toEqual([event(1)]);
    expect(opened).toEqual([SESSION_URL]);
    expect(keepalive.cancel).toHaveBeenCalledOnce();
  });

  it('finishes like Stop when the recorded tab closes', async () => {
    const {
      recorder,
      added,
      uploadSession,
      browser,
      settle,
      opened,
      keepalive,
    } = setup(account);
    const pageGone = browser.openPage(1);
    await recorder.start();
    recorder.add(event(1));
    // closing a tab removes it and also drops its page port
    browser.closeTab(1);
    pageGone();
    await settle();
    expect(added).toHaveBeenCalledOnce();
    expect(uploadSession).toHaveBeenCalledOnce();
    expect(uploadSession).toHaveBeenCalledWith('sess-1', account);
    expect(opened).toEqual([DASHBOARD_URL]);
    expect(keepalive.cancel).toHaveBeenCalledOnce();
    expect(recorder.getStatus().state).toBe('idle');
  });

  it('finishes a paused recording when the recorded tab closes', async () => {
    const { recorder, browser, settle, opened, addSession } = setup(null);
    browser.openPage(1);
    await recorder.start();
    recorder.add(event(1));
    await recorder.pauseClicked();
    browser.closeTab(1);
    await settle();
    expect(addSession).toHaveBeenCalledOnce();
    expect(opened).toEqual([SESSION_URL]);
  });

  it('ignores same-document navigation', async () => {
    const { recorder, state, added, uploadSession, browser, settle, opened } =
      setup(account);
    // a hash change or pushState keeps the document, so its port stays open
    browser.openPage(1);
    await recorder.start();
    recorder.add(event(1));
    state.tabs[1] = 'https://example.com/a#section';
    state.titles[1] = 'Another title';
    // a subframe of the recorded tab navigating drops only that frame's port
    browser.openPage(1, 3)();
    await settle();
    recorder.add(event(2));
    expect(recorder.getStatus()).toMatchObject({
      state: 'recording',
      tabId: 1,
    });
    expect(opened).toEqual([]);
    expect(uploadSession).not.toHaveBeenCalled();
    expect(added.mock.calls.map((c) => c[0].timestamp)).toEqual([1, 2]);
  });

  it('finishes once when the recorded tab closes while Stop is running', async () => {
    const {
      recorder,
      state,
      uploadSession,
      browser,
      settle,
      opened,
      addSession,
    } = setup(null);
    let answerStop = () => undefined as void;
    state.stopReply = new Promise<void>((r) => (answerStop = r));
    browser.openPage(1);
    await recorder.start();
    recorder.add(event(1));
    const stopping = recorder.stop();
    browser.closeTab(1);
    await settle();
    answerStop();
    await stopping;
    await settle();
    expect(addSession).toHaveBeenCalledOnce();
    expect(opened).toHaveLength(1);
    expect(uploadSession).not.toHaveBeenCalled();
    expect(recorder.getStatus().state).toBe('idle');
  });

  it('leaves the next recording alone when a Stop that overlapped the page going away resumes', async () => {
    const { recorder, state, added, uploadSession, browser, settle } =
      setup(account);
    let answerStop = () => undefined as void;
    state.stopReply = new Promise<void>((r) => (answerStop = r));
    const firstPageGone = browser.openPage(1);
    await recorder.start();
    const stopping = recorder.stop(); // waits for the tab to answer StopRecord
    firstPageGone(); // finishes the first recording meanwhile
    await settle();
    expect(uploadSession).toHaveBeenCalledOnce();
    state.stopReply = undefined;
    browser.openPage(1);
    await recorder.start();
    answerStop();
    await stopping;
    await settle();
    recorder.add(event(2));
    expect(recorder.getStatus()).toMatchObject({
      state: 'recording',
      tabId: 1,
    });
    expect(uploadSession).toHaveBeenCalledOnce();
    expect(added.mock.calls.map((c) => c[0].timestamp)).toEqual([2]);
  });

  it('ignores a pause reply that arrives after the recorded tab closed', async () => {
    const { recorder, state, browser, settle, saved } = setup(account);
    let answerStop = () => undefined as void;
    state.stopReply = new Promise<void>((r) => (answerStop = r));
    browser.openPage(1);
    await recorder.start();
    const pausing = recorder.pauseClicked(); // waits for the tab to answer StopRecord
    browser.closeTab(1); // finishes the recording meanwhile
    await settle();
    answerStop();
    await pausing;
    expect(recorder.getStatus()).toMatchObject({
      state: 'idle',
      lastError: { name: 'none' },
    });
    expect(saved[saved.length - 1]).toBe('idle');
  });

  it('finishes a start whose page went away before the tab confirmed', async () => {
    const {
      recorder,
      state,
      browser,
      added,
      uploadSession,
      opened,
      keepalive,
      settle,
    } = setup(account);
    const navigateAway = browser.openPage(1);
    state.emitOnStart = () => {
      recorder.add(typed(4, 10));
      navigateAway();
    };
    await recorder.start();
    await settle();
    expect(added.mock.calls.map((c) => c[0])).toEqual([typed(4, 10)]);
    expect(uploadSession).toHaveBeenCalledWith('sess-1', account);
    expect(opened).toEqual([DASHBOARD_URL]);
    expect(keepalive.cancel).toHaveBeenCalledOnce();
    expect(recorder.getStatus().state).toBe('idle');
  });

  it('closes the pause gap in a cloud recording too', async () => {
    const { recorder, state, addSession } = setup(account);
    await recorder.start();
    const first = event(100);
    recorder.add(first);
    state.now = 5000;
    await recorder.pauseClicked(); // paused at 5000
    state.now = 8000; // 3000ms paused
    await recorder.resumeClicked();
    await recorder.stop();
    expect(addSession.mock.calls[0][1].map((e) => e.timestamp)).toEqual([
      100 + 3000,
    ]);
  });

  it('keeps the offline pause timestamp shift', async () => {
    const { recorder, state, addSession } = setup(null);
    await recorder.start();
    const first = event(100);
    recorder.add(first);
    state.now = 5000;
    await recorder.pauseClicked(); // paused at 5000
    state.now = 8000;
    await recorder.resumeClicked();
    expect(first.timestamp).toBe(100 + 3000);
    await recorder.stop();
    expect(addSession).toHaveBeenCalledOnce();
  });

  it('uploads to the account it started with when the account changes mid-recording', async () => {
    const { recorder, state, uploadSession } = setup(account);
    await recorder.start();
    state.account = { ...account, publicKey: 'pk_other' };
    await recorder.pauseClicked();
    await recorder.resumeClicked();
    recorder.add(event(1));
    await recorder.stop();
    expect(uploadSession).toHaveBeenCalledWith('sess-1', account);
  });

  it('makes no sink and records the error when the tab refuses', async () => {
    const { recorder, state, sinks } = setup(account);
    state.refuse = true;
    await recorder.start();
    expect(sinks).toEqual([]);
    expect(recorder.getStatus()).toMatchObject({
      state: 'idle',
      lastError: { name: 'failed', message: 'cannot record here' },
    });
  });

  it('ignores a second start while the first is starting', async () => {
    const { recorder, requestToTab, sinks, keepalive, saved } = setup(account);
    const first = recorder.start();
    expect(recorder.getStatus().state).toBe('starting');
    const second = recorder.start();
    await Promise.all([first, second]);
    expect(
      requestToTab.mock.calls.filter((c) => c[1] === ServiceName.StartRecord),
    ).toHaveLength(1);
    expect(sinks).toHaveLength(1);
    expect(keepalive.ticks).toHaveLength(1);
    expect(saved).toContain('starting');
    expect(recorder.getStatus().state).toBe('recording');
    await recorder.stop();
    expect(keepalive.cancel).toHaveBeenCalledOnce();
  });

  it('returns to IDLE from STARTING when the tab refuses', async () => {
    const { recorder, state, saved } = setup(account);
    state.refuse = true;
    const starting = recorder.start();
    expect(recorder.getStatus().state).toBe('starting');
    await starting;
    expect(recorder.getStatus()).toMatchObject({
      state: 'idle',
      lastError: { name: 'failed', message: 'cannot record here' },
    });
    expect(saved[saved.length - 1]).toBe('idle');
    // a later start is accepted again
    state.refuse = false;
    await recorder.start();
    expect(recorder.getStatus().state).toBe('recording');
  });

  it('stores a cloud recording, uploads it and opens it in the dashboard', async () => {
    const {
      recorder,
      addSession,
      uploadSession,
      deleteSession,
      opened,
      onSessionsChanged,
    } = setup(account);
    await recorder.start();
    recorder.add(event(1));
    await recorder.stop();
    expect(addSession.mock.calls[0][1]).toEqual([event(1)]);
    expect(uploadSession).toHaveBeenCalledWith('sess-1', account);
    expect(deleteSession).toHaveBeenCalledWith('sess-1');
    // Open session lists drop the local copy the upload replaced.
    expect(onSessionsChanged).toHaveBeenCalledWith({ name: 'removed' });
    expect(opened).toEqual([DASHBOARD_URL]);
    expect(recorder.getStatus()).toEqual({
      state: 'idle',
      lastError: { name: 'none' },
    });
  });

  it('keeps a cloud recording that did not upload in Offline sessions and says so', async () => {
    const {
      recorder,
      uploadSession,
      deleteSession,
      opened,
      onSessionsChanged,
    } = setup(account);
    uploadSession.mockResolvedValueOnce({
      name: 'share-failed',
      errorMessage: 'Could not reach rrweb: Failed to fetch',
    });
    await recorder.start();
    recorder.add(event(1));
    await recorder.stop();
    expect(deleteSession).not.toHaveBeenCalled();
    expect(opened).toEqual([SESSION_URL]);
    expect(onSessionsChanged).toHaveBeenCalledWith({
      name: 'saved',
      session: expect.objectContaining({ id: 'sess-1', name: 'Page title' }),
    });
    expect(recorder.getStatus()).toMatchObject({
      state: 'idle',
      lastError: {
        name: 'failed',
        message: uploadFailedMessage('Could not reach rrweb: Failed to fetch'),
      },
    });
  });

  it('records offline when the popup asked for offline, even with an account stored', async () => {
    const { recorder, uploadSession, addSession } = setup(account);
    await recorder.start({ mode: 'offline' });
    recorder.add(event(1));
    await recorder.stop();
    expect(uploadSession).not.toHaveBeenCalled();
    expect(addSession).toHaveBeenCalledOnce();
  });

  it('refuses a cloud start for an organization that is no longer stored', async () => {
    const { recorder, injectRecorder, sinks } = setup(account);
    await recorder.start({ mode: 'cloud', orgId: 'org_2' });
    expect(injectRecorder).not.toHaveBeenCalled();
    expect(sinks).toEqual([]);
    expect(recorder.getStatus()).toMatchObject({
      state: 'idle',
      lastError: { name: 'failed', message: ACCOUNT_CHANGED_ERROR },
    });

    // A start for the organization that is stored records.
    await recorder.start({ mode: 'cloud', orgId: 'org_1' });
    expect(recorder.getStatus()).toMatchObject({
      state: 'recording',
      destination: { name: 'organization', orgName: 'Acme' },
    });
  });

  it('accepts events only from the recorded tab, top frame and recording', async () => {
    const { recorder, added, state } = setup(account);
    await recorder.start();
    const token = state.page.token;
    recorder.add(event(1)); // the recorded page
    recorder.add(event(2), { tabId: 2 }); // another tab
    recorder.add(event(3), { frameId: 5 }); // a frame inside the recorded tab
    recorder.add(event(4), { token: 'other-recording' });
    recorder.add(event(5), { tabId: undefined }); // not sent from a tab
    recorder.add(event(6), { token });
    expect(added.mock.calls.map((c) => c[0].timestamp)).toEqual([1, 6]);
  });

  it("drops a late event from the previous recording's page", async () => {
    const { recorder, added, state } = setup(account);
    await recorder.start();
    const firstToken = state.page.token;
    await recorder.stop();
    added.mockClear();
    await recorder.start(); // same tab, new recording
    expect(state.page.token).not.toBe(firstToken);
    recorder.add(event(1), { token: firstToken });
    recorder.add(event(2));
    expect(added.mock.calls.map((c) => c[0].timestamp)).toEqual([2]);
  });

  it('keeps the starting organization through a pause and resume', async () => {
    const { recorder } = setup(account);
    await recorder.start();
    await recorder.pauseClicked();
    await recorder.resumeClicked();
    expect(recorder.getStatus()).toMatchObject({
      state: 'recording',
      destination: { name: 'organization', orgName: 'Acme' },
    });
  });

  it('resumes with the same recording token', async () => {
    const { recorder, state, requestToTab } = setup(account);
    await recorder.start();
    const token = state.page.token;
    await recorder.pauseClicked();
    await recorder.resumeClicked();
    const starts = requestToTab.mock.calls.filter(
      (c) => c[1] === ServiceName.StartRecord,
    );
    expect(starts.map((c) => (c[2] as { token: string }).token)).toEqual([
      token,
      token,
    ]);
  });

  it('opens the offline player when an offline recording stops', async () => {
    const { recorder, opened, uploadSession } = setup(null);
    await recorder.start();
    await recorder.stop();
    expect(uploadSession).not.toHaveBeenCalled();
    expect(opened).toEqual([SESSION_URL]);
  });
  it('keeps the worker alive while recording', async () => {
    const { recorder, added, uploadSession, keepalive } = setup(account);
    await recorder.start();
    expect(keepalive.ticks).toHaveLength(1);
    expect(keepalive.ms).toBe(KEEPALIVE_INTERVAL_MS);
    expect(KEEPALIVE_INTERVAL_MS).toBeLessThan(30_000);
    keepalive.ticks[0]();
    keepalive.ticks[0]();
    expect(keepalive.ping).toHaveBeenCalledTimes(2);
    // the recording itself keeps working
    recorder.add(event(1));
    expect(added).toHaveBeenCalledOnce();
    expect(keepalive.cancel).not.toHaveBeenCalled();
    await recorder.stop();
    expect(keepalive.cancel).toHaveBeenCalledOnce();
    expect(uploadSession).toHaveBeenCalledOnce();
  });

  it('keeps an offline recording alive and uploads nothing', async () => {
    const { recorder, keepalive, uploadSession, addSession } = setup(null);
    await recorder.start();
    expect(keepalive.ticks).toHaveLength(1);
    keepalive.ticks[0]();
    expect(keepalive.ping).toHaveBeenCalledOnce();
    await recorder.stop();
    expect(keepalive.cancel).toHaveBeenCalledOnce();
    expect(addSession).toHaveBeenCalledOnce();
    expect(uploadSession).not.toHaveBeenCalled();
  });

  it('keeps the worker alive until a slow upload after Stop settles', async () => {
    for (const outcome of [
      SHARED,
      { name: 'share-failed', errorMessage: 'rrweb refused the upload (503)' },
    ] as ShareResult[]) {
      const { recorder, uploadSession, keepalive, opened, settle } =
        setup(account);
      let settleUpload: (result: ShareResult) => void = () => undefined;
      uploadSession.mockReturnValueOnce(
        new Promise<ShareResult>((resolve) => (settleUpload = resolve)),
      );
      await recorder.start();
      const stopping = recorder.stop();
      await settle();
      expect(uploadSession).toHaveBeenCalledOnce();
      expect(recorder.getStatus().state).toBe('idle');
      expect(keepalive.cancel).not.toHaveBeenCalled();
      keepalive.ticks[0]();
      expect(keepalive.ping).toHaveBeenCalledOnce();
      settleUpload(outcome);
      await stopping;
      expect(opened).toEqual([
        outcome.name === 'shared' ? DASHBOARD_URL : SESSION_URL,
      ]);
      expect(keepalive.cancel).toHaveBeenCalledOnce();
    }
  });

  it('keeps the worker alive until the stopped recording is stored', async () => {
    const { recorder, keepalive, addSession, uploadSession, settle } =
      setup(account);
    let stored: () => void = () => undefined;
    addSession.mockReturnValueOnce(
      new Promise<void>((resolve) => (stored = resolve)),
    );
    await recorder.start();
    const stopping = recorder.stop();
    await settle();
    expect(addSession).toHaveBeenCalledOnce();
    expect(uploadSession).not.toHaveBeenCalled();
    expect(keepalive.cancel).not.toHaveBeenCalled();
    stored();
    await stopping;
    expect(uploadSession).toHaveBeenCalledOnce();
    expect(keepalive.cancel).toHaveBeenCalledOnce();
  });

  it('stops the keepalive and reports the error when storing the recording fails', async () => {
    const { recorder, keepalive, addSession, uploadSession } = setup(account);
    addSession.mockRejectedValueOnce(new Error('quota exceeded'));
    await recorder.start();
    await recorder.stop();
    expect(recorder.getStatus()).toEqual({
      state: 'idle',
      lastError: { name: 'failed', message: 'quota exceeded' },
    });
    expect(uploadSession).not.toHaveBeenCalled();
    expect(keepalive.cancel).toHaveBeenCalledOnce();
  });

  it("leaves a new recording's keepalive and status alone while the last one uploads", async () => {
    const { recorder, uploadSession, keepalive, settle } = setup(account);
    let settleUpload: (result: ShareResult) => void = () => undefined;
    uploadSession.mockReturnValueOnce(
      new Promise<ShareResult>((resolve) => (settleUpload = resolve)),
    );
    await recorder.start();
    const stopping = recorder.stop();
    await settle();
    await recorder.start();
    expect(recorder.getStatus().state).toBe('recording');
    expect(keepalive.ticks).toHaveLength(2);
    expect(keepalive.cancel).not.toHaveBeenCalled();
    settleUpload({ name: 'share-failed', errorMessage: 'offline' });
    await stopping;
    expect(keepalive.cancel.mock.calls).toEqual([[0]]);
    // the failed upload's message does not land on the new recording
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
    expect(recorder.getStatus()).not.toHaveProperty('lastError');
    await recorder.stop();
    expect(keepalive.cancel.mock.calls).toEqual([[0], [1]]);
  });

  it('starts no keepalive when the tab refuses', async () => {
    const { recorder, state, keepalive } = setup(account);
    state.refuse = true;
    await recorder.start();
    expect(keepalive.ticks).toHaveLength(0);
  });

  it("keeps the first page's Meta and FullSnapshot emitted before the tab confirms (cloud)", async () => {
    const { recorder, state, added } = setup(account);
    const meta = typed(4, 10);
    const snapshot = typed(2, 11);
    state.emitOnStart = () => {
      recorder.add(meta);
      recorder.add(snapshot);
    };
    await recorder.start();
    recorder.add(typed(3, 12));
    expect(added.mock.calls.map((c) => c[0])).toEqual([
      meta,
      snapshot,
      typed(3, 12),
    ]);
  });

  it("keeps the first page's Meta and FullSnapshot emitted before the tab confirms (offline)", async () => {
    const { recorder, state, addSession } = setup(null);
    const meta = typed(4, 10);
    const snapshot = typed(2, 11);
    state.emitOnStart = () => {
      recorder.add(meta);
      recorder.add(snapshot);
    };
    await recorder.start();
    recorder.add(typed(3, 12));
    await recorder.stop();
    const stored = (addSession.mock.calls[0] as unknown[])[1];
    expect(stored).toEqual([meta, snapshot, typed(3, 12)]);
  });

  it('drops events buffered during a refused start', async () => {
    const { recorder, state, added, sinks, addSession } = setup(account);
    state.refuse = true;
    state.emitOnStart = () => recorder.add(typed(4, 10));
    await recorder.start();
    expect(sinks).toEqual([]);
    expect(added).not.toHaveBeenCalled();
    // the next successful start does not replay the old event
    state.refuse = false;
    state.emitOnStart = undefined;
    await recorder.start();
    recorder.add(typed(3, 20));
    expect(added.mock.calls.map((c) => c[0])).toEqual([typed(3, 20)]);
    expect(addSession).not.toHaveBeenCalled();
  });

  it('does not start without a current tab, and the next start works', async () => {
    const { recorder, state, saved, injectRecorder } = setup(null);
    state.currentTab = -1;
    await recorder.start();
    expect(recorder.getStatus()).toEqual({
      state: 'idle',
      lastError: { name: 'none' },
    });
    expect(saved).toEqual(['starting', 'idle']);
    expect(injectRecorder).not.toHaveBeenCalled();
    state.currentTab = 1;
    await recorder.start();
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
  });

  it('holds only the recorded tab’s top-frame events for this start', async () => {
    const { recorder, state, added } = setup(null);
    state.emitOnStart = () => {
      recorder.add(event(1), { token: 'other-recording' });
      recorder.add(event(2), { tabId: 2 });
      recorder.add(event(3), { frameId: 3 });
      recorder.add(event(4));
    };
    await recorder.start();
    expect(added.mock.calls.map((c) => c[0].timestamp)).toEqual([4]);
  });

  it('keeps a start going when another tab’s page goes away', async () => {
    const { recorder, state, browser, opened, settle } = setup(null);
    browser.openPage(1);
    const otherPageGoes = browser.openPage(2);
    state.emitOnStart = () => otherPageGoes();
    await recorder.start();
    await settle();
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
    expect(opened).toEqual([]);
  });

  it('a departed start finishes only its own recording', async () => {
    const { recorder, state, browser, addSession, settle } = setup(null);
    let release: () => void = () => undefined;
    state.holdSave = {
      state: 'recording',
      until: new Promise((r) => (release = r)),
    };
    const navigateAway = browser.openPage(1);
    state.emitOnStart = () => {
      state.emitOnStart = undefined;
      navigateAway(); // the page goes away before the tab confirms
    };
    const first = recorder.start();
    await settle(); // the start now waits on its recording save
    await recorder.stop();
    await recorder.start();
    release();
    await first;
    await settle();
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
    expect(addSession).toHaveBeenCalledOnce();
  });

  it('a finished start’s cleanup leaves a newer start in flight alone', async () => {
    const { recorder, state, settle } = setup(null);
    let release: () => void = () => undefined;
    state.holdSave = {
      state: 'recording',
      until: new Promise((r) => (release = r)),
    };
    const first = recorder.start();
    await settle();
    await recorder.stop();
    let confirm: () => void = () => undefined;
    state.startReply = new Promise((r) => (confirm = r));
    const second = recorder.start();
    await settle();
    release();
    await first;
    expect(recorder.getStatus()).toEqual({ state: 'starting' });
    confirm();
    await second;
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
  });

  it('a storage failure from the last recording leaves a newer one recording', async () => {
    const { recorder, addSession, settle } = setup(account);
    let fail: (e: Error) => void = () => undefined;
    addSession.mockReturnValueOnce(
      new Promise<void>((_, reject) => (fail = reject)),
    );
    await recorder.start();
    const stopping = recorder.stop();
    await settle();
    await recorder.start();
    fail(new Error('quota exceeded'));
    await stopping;
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
    expect(recorder.getStatus()).not.toHaveProperty('lastError');
  });

  it('ignores a second pause click while the page has not answered the first', async () => {
    const { recorder, state, requestToTab } = setup(null);
    await recorder.start();
    let answer: () => void = () => undefined;
    state.stopReply = new Promise((r) => (answer = r));
    const first = recorder.pauseClicked();
    const second = recorder.pauseClicked();
    // the popup keeps showing the recording until the page answers
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
    answer();
    await Promise.all([first, second]);
    const stops = requestToTab.mock.calls.filter(
      (c) => c[1] === ServiceName.StopRecord,
    );
    expect(stops).toHaveLength(1);
    expect(recorder.getStatus()).toMatchObject({ state: 'paused' });
  });

  it('a late pause reply from a finished recording leaves the next one’s pause alone', async () => {
    const { recorder, state, browser, settle } = setup(null);
    let answer: () => void = () => undefined;
    state.stopReply = new Promise((r) => (answer = r));
    browser.openPage(1);
    await recorder.start(); // started at 1000
    const firstPause = recorder.pauseClicked();
    browser.closeTab(1); // finishes the first recording meanwhile
    await settle();
    state.now = 2000;
    await recorder.start();
    const secondPause = recorder.pauseClicked();
    answer(); // both pages answer now
    await Promise.all([firstPause, secondPause]);
    expect(recorder.getStatus()).toMatchObject({
      state: 'paused',
      startTimestamp: 2000,
    });
  });

  it('ignores a second resume click while the page has not answered the first', async () => {
    const { recorder, state, injectRecorder, addSession, settle } = setup(null);
    await recorder.start();
    recorder.add(event(100));
    state.now = 5000;
    await recorder.pauseClicked();
    state.now = 8000;
    let injected: () => void = () => undefined;
    injectRecorder.mockReturnValueOnce(new Promise((r) => (injected = r)));
    const first = recorder.resumeClicked();
    await settle(); // the first resume now waits on the page
    const second = recorder.resumeClicked();
    injected();
    await Promise.all([first, second]);
    expect(injectRecorder).toHaveBeenCalledTimes(2); // the start and one resume
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
    await recorder.stop();
    expect(addSession.mock.calls[0][1].map((e) => e.timestamp)).toEqual([
      100 + 3000,
    ]);
  });

  it('a resume that settles after the tab closed leaves the recorder idle', async () => {
    for (const settles of ['fails', 'succeeds'] as const) {
      const { recorder, injectRecorder, browser, settle } = setup(null);
      browser.openPage(1);
      await recorder.start();
      await recorder.pauseClicked();
      let answer: () => void = () => undefined;
      injectRecorder.mockReturnValueOnce(
        new Promise<void>((resolve, reject) => {
          answer = () =>
            settles === 'fails'
              ? reject(new Error('Cannot access this page'))
              : resolve();
        }),
      );
      const resuming = recorder.resumeClicked();
      await settle();
      browser.closeTab(1);
      await settle();
      answer();
      await resuming;
      expect(recorder.getStatus(), settles).toEqual({
        state: 'idle',
        lastError: { name: 'none' },
      });
    }
  });

  it('undoes a failed resume’s shift, so the next resume shifts once', async () => {
    const { recorder, state, injectRecorder, addSession } = setup(null);
    await recorder.start();
    recorder.add(event(100));
    state.now = 5000;
    await recorder.pauseClicked();
    state.now = 8000;
    injectRecorder.mockRejectedValueOnce(new Error('Cannot access this page'));
    await recorder.resumeClicked();
    state.now = 9000;
    await recorder.resumeClicked();
    await recorder.stop();
    expect(addSession.mock.calls[0][1].map((e) => e.timestamp)).toEqual([
      100 + 4000,
    ]);
  });

  it('a resume stopped while the page script loads never restarts that recording', async () => {
    const { recorder, injectRecorder, requestToTab, addSession, settle } =
      setup(null);
    await recorder.start(); // token-1
    await recorder.pauseClicked();
    let injected: () => void = () => undefined;
    injectRecorder.mockReturnValueOnce(new Promise((r) => (injected = r)));
    const resuming = recorder.resumeClicked();
    await settle(); // the resume waits on the injection
    await recorder.stop();
    await recorder.start(); // token-2, in the same tab
    injected();
    await resuming;
    const startTokens = requestToTab.mock.calls
      .filter((c) => c[1] === ServiceName.StartRecord)
      .map((c) => (c[2] as { token: string }).token);
    expect(startTokens).toEqual(['token-1', 'token-2']);
    recorder.add(event(7)); // the page records under its latest token
    await recorder.stop();
    expect(addSession.mock.calls[1][1]).toEqual([event(7)]);
  });

  it('a resume the page confirms after Stop tells that page to stop', async () => {
    const { recorder, state, requestToTab, settle } = setup(null);
    await recorder.start();
    await recorder.pauseClicked();
    let confirm: () => void = () => undefined;
    state.startReply = new Promise((r) => (confirm = r));
    const resuming = recorder.resumeClicked();
    await settle(); // StartRecord is with the page
    await recorder.stop();
    const stops = () =>
      requestToTab.mock.calls.filter(
        (c) => c[0] === 1 && c[1] === ServiceName.StopRecord,
      ).length;
    expect(stops()).toBe(1); // the pause's
    confirm();
    await resuming;
    await settle();
    expect(stops()).toBe(2);
    expect(recorder.getStatus()).toMatchObject({ state: 'idle' });
  });

  it('a late resume confirmation leaves a newer recording in that tab recording', async () => {
    const { recorder, state, requestToTab, addSession, settle } = setup(null);
    await recorder.start();
    await recorder.pauseClicked();
    let confirm: () => void = () => undefined;
    state.startReply = new Promise((r) => (confirm = r));
    const resuming = recorder.resumeClicked();
    await settle();
    await recorder.stop();
    const starting = recorder.start(); // the newer start waits on the same page
    await settle();
    confirm(); // the page confirms the old resume, then the newer start
    await Promise.all([resuming, starting]);
    await settle();
    const stops = requestToTab.mock.calls.filter(
      (c) => c[1] === ServiceName.StopRecord,
    );
    expect(stops).toHaveLength(1); // only the pause's
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
    recorder.add(event(9));
    await recorder.stop();
    expect(addSession.mock.calls[1][1]).toEqual([event(9)]);
  });

  it('Stop while a pause waits for the page still stops the page, and the late reply pauses nothing', async () => {
    const { recorder, state, requestToTab } = setup(null);
    await recorder.start();
    let answer: () => void = () => undefined;
    requestToTab.mockReturnValueOnce(
      new Promise((r) => (answer = () => r({ endTimestamp: state.now }))),
    );
    const pausing = recorder.pauseClicked(); // the page has not answered yet
    await recorder.stop();
    answer(); // the pause reply arrives after the recording finished
    await pausing;
    const stops = requestToTab.mock.calls.filter(
      (c) => c[1] === ServiceName.StopRecord,
    );
    expect(stops).toHaveLength(2); // the pause's and the Stop's
    expect(recorder.getStatus()).toEqual({
      state: 'idle',
      lastError: { name: 'none' },
    });
  });

  it('gives each status exactly the data of its state', async () => {
    const { recorder, state, saved } = setup(account);
    expect(recorder.getStatus()).toEqual({
      state: 'idle',
      lastError: { name: 'none' },
    });
    const starting = recorder.start();
    expect(recorder.getStatus()).toEqual({ state: 'starting' });
    await starting;
    const destination = { name: 'organization', orgName: 'Acme' };
    expect(recorder.getStatus()).toEqual({
      state: 'recording',
      tabId: 1,
      startTimestamp: 1000,
      destination,
    });
    state.now = 5000;
    await recorder.pauseClicked();
    expect(recorder.getStatus()).toEqual({
      state: 'paused',
      tabId: 1,
      startTimestamp: 1000,
      pausedTimestamp: 5000,
      destination,
      lastError: { name: 'none' },
    });
    state.now = 7000;
    await recorder.resumeClicked();
    // the 2 s pause moves the start later
    expect(recorder.getStatus()).toEqual({
      state: 'recording',
      tabId: 1,
      startTimestamp: 3000,
      destination,
    });
    await recorder.stop();
    expect(recorder.getStatus()).toEqual({
      state: 'idle',
      lastError: { name: 'none' },
    });
    expect(saved).toEqual([
      'starting',
      'recording',
      'paused',
      'paused',
      'recording',
      'idle',
    ]);
  });

  it('dates a pause the page did not answer from the click', async () => {
    const { recorder, state, requestToTab } = setup(null);
    await recorder.start();
    state.now = 4000;
    let refuse: (e: Error) => void = () => undefined;
    requestToTab.mockReturnValueOnce(
      new Promise((_, reject) => (refuse = reject)),
    );
    const pausing = recorder.pauseClicked();
    state.now = 4500; // the page takes a while to fail
    refuse(new Error('page gone quiet'));
    await pausing;
    expect(recorder.getStatus()).toMatchObject({
      state: 'paused',
      pausedTimestamp: 4000,
    });
    state.now = 6000;
    await recorder.resumeClicked();
    expect(recorder.getStatus()).toMatchObject({
      state: 'recording',
      startTimestamp: 3000,
    });
  });

  it('shows a failed resume on the paused status and clears it on the next resume', async () => {
    const { recorder, injectRecorder } = setup(null);
    await recorder.start();
    await recorder.pauseClicked();
    injectRecorder.mockRejectedValueOnce(new Error('Cannot access this page'));
    await recorder.resumeClicked();
    expect(recorder.getStatus()).toMatchObject({
      state: 'paused',
      lastError: { name: 'failed', message: 'Cannot access this page' },
    });
    let injected: () => void = () => undefined;
    injectRecorder.mockReturnValueOnce(new Promise((r) => (injected = r)));
    const resuming = recorder.resumeClicked();
    expect(recorder.getStatus()).toMatchObject({
      state: 'paused',
      lastError: { name: 'none' },
    });
    injected();
    await resuming;
    expect(recorder.getStatus()).toMatchObject({ state: 'recording' });
  });
});

describe('recording badge', () => {
  const { RECORDING, PAUSED } = BADGE_COLORS;
  const last = (calls: string[]) => calls[calls.length - 1];

  it('shows REC on the recorded tab only, steady red', async () => {
    const { recorder, badgeCalls, state } = setup(account);
    state.currentTab = 2;
    await recorder.start();
    expect(badgeCalls).toEqual([`set:2:REC:${RECORDING}`]);
  });

  it('shows the muted red while paused and red again on resume', async () => {
    const { recorder, badgeCalls } = setup(account);
    await recorder.start();
    await recorder.pauseClicked();
    expect(last(badgeCalls)).toBe(`set:1:REC:${PAUSED}`);
    await recorder.resumeClicked();
    expect(last(badgeCalls)).toBe(`set:1:REC:${RECORDING}`);
  });

  it('clears the badge however the recording finishes', async () => {
    const endings: [
      string,
      (run: ReturnType<typeof setup>) => Promise<void>,
    ][] = [
      ['stop', (run) => run.recorder.stop()],
      ['page gone', (run) => Promise.resolve(run.browser.openPage(1)())],
      ['tab closed', (run) => Promise.resolve(run.browser.closeTab(1))],
      [
        'upload failed',
        async (run) => {
          run.uploadSession.mockResolvedValueOnce({
            name: 'share-failed',
            errorMessage: 'offline',
          });
          await run.recorder.stop();
        },
      ],
    ];
    for (const [ending, finish] of endings) {
      const run = setup(account);
      await run.recorder.start();
      expect(last(run.badgeCalls), ending).toBe(`set:1:REC:${RECORDING}`);
      await finish(run);
      await run.settle();
      expect(last(run.badgeCalls), ending).toBe('clear:1');
    }
  });

  it('leaves no badge when the start is refused', async () => {
    const { recorder, badgeCalls, state } = setup(account);
    state.refuse = true;
    await recorder.start();
    expect(badgeCalls.filter((c) => c.startsWith('set'))).toEqual([]);
  });

  it('keeps recording when the badge API fails', async () => {
    const { recorder, badgeFailure, saved } = setup(account);
    badgeFailure.set = true;
    await recorder.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(recorder.getStatus().state).toBe('recording');
    expect(saved).toContain('recording');
    await recorder.stop();
    expect(recorder.getStatus().state).toBe('idle');
  });

  it('contains a badge API that throws synchronously', () => {
    const badge = createBadge({
      setBadge: () => {
        throw new Error('sync boom');
      },
      clearBadge: () => Promise.resolve(),
    });
    expect(() => badge.sync(recordingIn(1))).not.toThrow();
  });

  it('registers no timer', () => {
    vi.useFakeTimers();
    try {
      const badge = createBadge({
        setBadge: () => Promise.resolve(),
        clearBadge: () => Promise.resolve(),
      });
      badge.sync(recordingIn(1));
      badge.sync({
        ...recordingIn(1),
        state: 'paused',
        pausedTimestamp: 2,
        lastError: { name: 'none' },
      });
      badge.sync({ state: 'idle', lastError: { name: 'none' } });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
