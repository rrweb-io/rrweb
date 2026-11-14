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
import { RecorderStatus, ServiceName } from '~/types';
import type { CloudAccount, Session, ShareResult, StartRequest } from '~/types';

const account: CloudAccount = {
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};
const event = (timestamp: number) => ({ timestamp } as eventWithTime);
const typed = (type: number, timestamp: number) =>
  ({ type, timestamp } as eventWithTime);

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
    getURL: (path: string) => `chrome-extension://abc/${path}`,
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
      return Promise.resolve({ startTimestamp: state.now });
    },
  );
  const opened: string[] = [];
  const saved: RecorderStatus[] = [];
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
      saved.push(s.status);
      return Promise.resolve();
    },
    getTabTitle: (tabId) => Promise.resolve(state.titles[tabId]),
    openTab: (url) => {
      opened.push(url);
      return Promise.resolve();
    },
    onSessionUpdated: vi.fn(),
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
    after: () =>
      state.startHangs ? Promise.resolve() : new Promise(() => undefined),
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
    onSessionUpdated: deps.onSessionUpdated as ReturnType<typeof vi.fn>,
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
      status: RecorderStatus.RECORDING,
      activeTabId: 2,
    });
  });

  it('gives up a start the page never confirms, and frees the record button', async () => {
    const { recorder, state, requestToTab, sinks, keepalive } = setup(account);
    state.startHangs = true;
    await recorder.start();
    expect(sinks).toEqual([]);
    expect(keepalive.ticks).toHaveLength(0);
    expect(recorder.getStatus()).toMatchObject({
      status: RecorderStatus.IDLE,
      errorMessage: START_TIMEOUT_ERROR,
    });
    // the page is told to stop in case it starts late
    expect(
      requestToTab.mock.calls.some((c) => c[1] === ServiceName.StopRecord),
    ).toBe(true);
    state.startHangs = false;
    await recorder.start();
    expect(recorder.getStatus().status).toBe(RecorderStatus.RECORDING);
  });

  it('keeps the organization a cloud recording started with in its status', async () => {
    const cloudRun = setup(account);
    await cloudRun.recorder.start();
    expect(cloudRun.recorder.getStatus().uploadsTo).toBe('Acme');
    const offlineRun = setup(null);
    await offlineRun.recorder.start();
    expect(offlineRun.recorder.getStatus().uploadsTo).toBeUndefined();
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
      status: RecorderStatus.IDLE,
      errorMessage: 'Cannot access this page',
    });
    // the next start on a page that can be recorded works
    await recorder.start();
    expect(recorder.getStatus().status).toBe(RecorderStatus.RECORDING);
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
      status: RecorderStatus.RECORDING,
      activeTabId: 1,
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
    expect(recorder.getStatus().status).toBe(RecorderStatus.IDLE);
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
    expect(recorder.getStatus().status).toBe(RecorderStatus.IDLE);
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
      status: RecorderStatus.RECORDING,
      activeTabId: 1,
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
    expect(recorder.getStatus().status).toBe(RecorderStatus.IDLE);
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
      status: RecorderStatus.RECORDING,
      activeTabId: 1,
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
      status: RecorderStatus.IDLE,
      activeTabId: -1,
    });
    expect(saved[saved.length - 1]).toBe(RecorderStatus.IDLE);
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
    expect(recorder.getStatus().status).toBe(RecorderStatus.IDLE);
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
      status: RecorderStatus.IDLE,
      errorMessage: 'cannot record here',
    });
  });

  it('ignores a second start while the first is starting', async () => {
    const { recorder, requestToTab, sinks, keepalive, saved } = setup(account);
    const first = recorder.start();
    expect(recorder.getStatus().status).toBe(RecorderStatus.STARTING);
    const second = recorder.start();
    await Promise.all([first, second]);
    expect(
      requestToTab.mock.calls.filter((c) => c[1] === ServiceName.StartRecord),
    ).toHaveLength(1);
    expect(sinks).toHaveLength(1);
    expect(keepalive.ticks).toHaveLength(1);
    expect(saved).toContain(RecorderStatus.STARTING);
    expect(recorder.getStatus().status).toBe(RecorderStatus.RECORDING);
    await recorder.stop();
    expect(keepalive.cancel).toHaveBeenCalledOnce();
  });

  it('returns to IDLE from STARTING when the tab refuses', async () => {
    const { recorder, state, saved } = setup(account);
    state.refuse = true;
    const starting = recorder.start();
    expect(recorder.getStatus().status).toBe(RecorderStatus.STARTING);
    await starting;
    expect(recorder.getStatus()).toMatchObject({
      status: RecorderStatus.IDLE,
      errorMessage: 'cannot record here',
    });
    expect(saved[saved.length - 1]).toBe(RecorderStatus.IDLE);
    // a later start is accepted again
    state.refuse = false;
    await recorder.start();
    expect(recorder.getStatus().status).toBe(RecorderStatus.RECORDING);
  });

  it('stores a cloud recording, uploads it and opens it in the dashboard', async () => {
    const { recorder, addSession, uploadSession, deleteSession, opened } =
      setup(account);
    await recorder.start();
    recorder.add(event(1));
    await recorder.stop();
    expect(addSession.mock.calls[0][1]).toEqual([event(1)]);
    expect(uploadSession).toHaveBeenCalledWith('sess-1', account);
    expect(deleteSession).toHaveBeenCalledWith('sess-1');
    expect(opened).toEqual([DASHBOARD_URL]);
    expect(recorder.getStatus().errorMessage).toBeUndefined();
  });

  it('keeps a cloud recording that did not upload in Offline sessions and says so', async () => {
    const { recorder, uploadSession, deleteSession, opened, onSessionUpdated } =
      setup(account);
    uploadSession.mockResolvedValueOnce({
      name: 'share-failed',
      errorMessage: 'Could not reach rrweb: Failed to fetch',
    });
    await recorder.start();
    recorder.add(event(1));
    await recorder.stop();
    expect(deleteSession).not.toHaveBeenCalled();
    expect(opened).toEqual([SESSION_URL]);
    expect(onSessionUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sess-1', name: 'Page title' }),
    );
    expect(recorder.getStatus()).toMatchObject({
      status: RecorderStatus.IDLE,
      errorMessage: uploadFailedMessage(
        'Could not reach rrweb: Failed to fetch',
      ),
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
      status: RecorderStatus.IDLE,
      errorMessage: ACCOUNT_CHANGED_ERROR,
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
      status: RecorderStatus.RECORDING,
      uploadsTo: 'Acme',
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
      expect(recorder.getStatus().status).toBe(RecorderStatus.IDLE);
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
    expect(recorder.getStatus().errorMessage).toBe('quota exceeded');
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
    expect(recorder.getStatus().status).toBe(RecorderStatus.RECORDING);
    expect(keepalive.ticks).toHaveLength(2);
    expect(keepalive.cancel).not.toHaveBeenCalled();
    settleUpload({ name: 'share-failed', errorMessage: 'offline' });
    await stopping;
    expect(keepalive.cancel.mock.calls).toEqual([[0]]);
    // the failed upload's message does not land on the new recording
    expect(recorder.getStatus().status).toBe(RecorderStatus.RECORDING);
    expect(recorder.getStatus().errorMessage).toBeUndefined();
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

  it('reports which kind of recording is running', async () => {
    const cloud = setup(account);
    await cloud.recorder.start();
    expect(cloud.recorder.getStatus()).toMatchObject({ kind: 'cloud' });
    cloud.state.now = 5000;
    await cloud.recorder.pauseClicked();
    expect(cloud.recorder.getStatus()).toMatchObject({
      status: RecorderStatus.PAUSED,
      kind: 'cloud',
    });
    await cloud.recorder.resumeClicked();
    expect(cloud.recorder.getStatus()).toMatchObject({
      status: RecorderStatus.RECORDING,
      kind: 'cloud',
    });
    await cloud.recorder.stop();
    expect(cloud.recorder.getStatus().kind).toBeUndefined();
    const offline = setup(null);
    await offline.recorder.start();
    expect(offline.recorder.getStatus()).toMatchObject({ kind: 'offline' });
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

  it('clears the badge when the recording stops', async () => {
    const { recorder, badgeCalls } = setup(account);
    await recorder.start();
    await recorder.stop();
    expect(last(badgeCalls)).toBe('clear:1');
  });

  it('clears the badge when the page goes away', async () => {
    const { recorder, browser, badgeCalls, settle } = setup(account);
    await recorder.start();
    browser.openPage(1)();
    await settle();
    expect(last(badgeCalls)).toBe('clear:1');
  });

  it('clears the badge when the tab closes', async () => {
    const { recorder, browser, badgeCalls, settle } = setup(account);
    await recorder.start();
    browser.closeTab(1);
    await settle();
    expect(last(badgeCalls)).toBe('clear:1');
  });

  it('clears the badge when the cloud upload fails', async () => {
    const { recorder, badgeCalls, uploadSession } = setup(account);
    uploadSession.mockResolvedValueOnce({
      name: 'share-failed',
      errorMessage: 'offline',
    });
    await recorder.start();
    await recorder.stop();
    expect(last(badgeCalls)).toBe('clear:1');
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
    expect(recorder.getStatus().status).toBe(RecorderStatus.RECORDING);
    expect(saved).toContain(RecorderStatus.RECORDING);
    await recorder.stop();
    expect(recorder.getStatus().status).toBe(RecorderStatus.IDLE);
  });

  it('contains a badge API that throws synchronously', () => {
    const badge = createBadge({
      setBadge: () => {
        throw new Error('sync boom');
      },
      clearBadge: () => Promise.resolve(),
    });
    expect(() =>
      badge.sync({ status: RecorderStatus.RECORDING, activeTabId: 1 }),
    ).not.toThrow();
  });

  it('registers no timer', () => {
    vi.useFakeTimers();
    try {
      const badge = createBadge({
        setBadge: () => Promise.resolve(),
        clearBadge: () => Promise.resolve(),
      });
      const status = { status: RecorderStatus.RECORDING, activeTabId: 1 };
      badge.sync(status);
      badge.sync({ ...status, status: RecorderStatus.PAUSED });
      badge.sync({ ...status, status: RecorderStatus.IDLE });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
