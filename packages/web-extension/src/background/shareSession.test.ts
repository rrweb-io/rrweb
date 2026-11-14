import { describe, expect, it, vi } from 'vitest';
import { EventType, type eventWithTime } from '@rrweb/types';
import type { CloudAccount, SharedSessions } from '~/types';
import type { StoredUnsentEvents } from '~/utils/storage';
import type { UploadResult } from './upload';
import {
  createSessionSharing,
  parseShareRequest,
  NO_PAGE_ADDRESS_ERROR,
  SESSION_MISSING_ERROR,
  SHARE_ACCOUNT_CHANGED_ERROR,
  INVALID_SHARE_ERROR,
  PENDING_ELSEWHERE_ERROR,
} from './shareSession';

const ACCOUNT: CloudAccount = {
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};

const OWNER = { orgId: 'org_1', orgName: 'Acme' };

const META = {
  type: EventType.Meta,
  data: {
    href: 'https://shop.example.com/checkout?step=2',
    width: 800,
    height: 600,
  },
  timestamp: 1000,
} as eventWithTime;
const SNAPSHOT = {
  type: EventType.FullSnapshot,
  data: { node: { id: 1 }, initialOffset: { top: 0, left: 0 } },
  timestamp: 1001,
} as unknown as eventWithTime;
const CLICK = {
  type: EventType.IncrementalSnapshot,
  data: { source: 2, type: 2, id: 5 },
  timestamp: 1500,
} as unknown as eventWithTime;

const NOW = 9_000_000;

function setup(events: eventWithTime[] = [META, SNAPSHOT, CLICK]) {
  const store = {
    account: ACCOUNT as CloudAccount | null,
    shared: {} as SharedSessions,
    sessions: new Map([['session-1', { events, recorderVersion: '2.2.2' }]]),
    unsent: new Map<string, StoredUnsentEvents>(),
    failNextDeleteUnsent: false,
  };
  const opened: string[] = [];
  const postEvents = vi.fn(
    (..._args: unknown[]): Promise<UploadResult> =>
      Promise.resolve({ state: 'delivered' }),
  );
  const writeShared = vi.fn((shared: SharedSessions) => {
    store.shared = shared;
    return Promise.resolve();
  });
  let ids = 0;
  // A fresh instance over the same storage, as after a worker restart.
  const restart = () =>
    createSessionSharing({
      getConnection: () =>
        Promise.resolve(
          store.account
            ? { name: 'connected', account: store.account }
            : { name: 'not-connected' },
        ),
      loadSession: (id) => Promise.resolve(store.sessions.get(id)),
      deleteStored: (ids) => {
        ids.forEach((id) => store.sessions.delete(id));
        return Promise.resolve();
      },
      readShared: () => Promise.resolve(store.shared),
      writeShared,
      putUnsent: (upload) => {
        store.unsent.set(upload.recordingId, upload);
        return Promise.resolve();
      },
      getUnsent: (id) => Promise.resolve(store.unsent.get(id)),
      deleteUnsent: (id) => {
        if (store.failNextDeleteUnsent) {
          store.failNextDeleteUnsent = false;
          return Promise.reject(new Error('IndexedDB is busy'));
        }
        store.unsent.delete(id);
        return Promise.resolve();
      },
      postEvents,
      randomId: () => `rec-${++ids}`,
      openTab: (url) => {
        opened.push(url);
        return Promise.resolve();
      },
      now: () => NOW,
    });
  const request = { sessionId: 'session-1', orgId: 'org_1' };
  return {
    store,
    opened,
    postEvents,
    writeShared,
    sharing: restart(),
    restart,
    request,
    idsMade: () => ids,
  };
}

/** The events one postEvents call sent, and the recording it sent them to. */
function sentIn(postEvents: ReturnType<typeof setup>['postEvents'], call = 0) {
  const [options, sent] = postEvents.mock.calls[call] as [
    { publicKey: string; recordingId: string },
    string[],
  ];
  return {
    options,
    sent,
    parsed: sent.map((s) => JSON.parse(s) as eventWithTime),
  };
}

/** An event moved by the share-time shift of the fixture (first event 1000). */
const shifted = (event: eventWithTime) => ({
  ...event,
  timestamp: event.timestamp + NOW - 1000,
});

describe('sharing an offline session', () => {
  it('shares an offline session once and remembers the cloud recording', async () => {
    const { store, opened, postEvents, sharing, request } = setup();

    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });

    expect(postEvents).toHaveBeenCalledTimes(1);
    const { options, parsed } = sentIn(postEvents);
    expect(options).toEqual({ publicKey: 'pk_acme', recordingId: 'rec-1' });
    expect(parsed).toHaveLength(5);
    expect(parsed[0]).toEqual({
      type: EventType.Custom,
      timestamp: NOW,
      data: {
        tag: 'recording-meta',
        payload: {
          domain: 'shop.example.com',
          includePii: false,
          jsEntrypoint: 'chrome-extension',
          recordVersion: '2.2.2',
        },
      },
    });
    expect(parsed.slice(1, 4)).toEqual([META, SNAPSHOT, CLICK].map(shifted));
    expect(parsed[4]).toEqual({
      type: EventType.Custom,
      timestamp: shifted(CLICK).timestamp,
      data: { tag: 'close-permanent', payload: {} },
    });
    expect(store.shared).toEqual({
      'session-1': { state: 'shared', recordingId: 'rec-1' },
    });
    expect(store.unsent.size).toBe(0);
    expect(opened).toEqual([expect.stringMatching(/\/recordings\/rec-1$/)]);

    // Pressed again, it answers with the same recording and sends nothing.
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
    expect(postEvents).toHaveBeenCalledTimes(1);
  });

  it('uploads once when Share is pressed twice before the first finishes', async () => {
    const { store, postEvents, sharing, request } = setup();
    let release: () => void = () => undefined;
    postEvents.mockReturnValueOnce(
      new Promise((resolve) => {
        release = () => resolve({ state: 'delivered' });
      }),
    );
    const first = sharing.share(request);
    const second = sharing.share(request);
    await vi.waitFor(() => expect(postEvents).toHaveBeenCalledTimes(1));
    release();
    const results = await Promise.all([first, second]);
    expect(results).toEqual([
      { name: 'shared', recordingId: 'rec-1' },
      { name: 'shared', recordingId: 'rec-1' },
    ]);
    expect(postEvents).toHaveBeenCalledTimes(1);
    expect(store.shared).toEqual({
      'session-1': { state: 'shared', recordingId: 'rec-1' },
    });
  });

  it('refuses to share when the connected organization changed', async () => {
    const { store, opened, postEvents, sharing, request } = setup();
    store.account = { ...ACCOUNT, orgId: 'org_2', orgName: 'Beta' };
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'share-failed',
      errorMessage: SHARE_ACCOUNT_CHANGED_ERROR,
    });
    store.account = null;
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'share-failed',
      errorMessage: SHARE_ACCOUNT_CHANGED_ERROR,
    });
    expect(postEvents).not.toHaveBeenCalled();
    expect(store.shared).toEqual({});
    expect(opened).toEqual([]);

    // The same request goes through once the account matches again.
    store.account = ACCOUNT;
    await expect(sharing.share(request)).resolves.toMatchObject({
      name: 'shared',
    });
  });

  it('starts the shared recording at share time and keeps every gap', async () => {
    const { postEvents, sharing, request } = setup();
    await sharing.share(request);
    const stamps = sentIn(postEvents).parsed.map((e) => e.timestamp);
    // Filed and billed at share time, not when it was recorded offline.
    expect(stamps[0]).toBeGreaterThanOrEqual(NOW);
    expect(stamps[0] - NOW).toBeLessThan(1000);
    const gaps = (ts: number[]) => ts.slice(1).map((t, i) => t - ts[i]);
    // meta, the three events, close: the same spacing as recorded
    expect(gaps(stamps)).toEqual(gaps([1000, 1000, 1001, 1500, 1500]));
  });

  it('resends only the undelivered events to the same recording after a failure', async () => {
    const { store, opened, postEvents, sharing, request, idsMade } = setup();
    postEvents.mockImplementationOnce((_options, events) =>
      Promise.resolve({
        state: 'not-delivered',
        error: new Error('Server answered 503'),
        unsent: (events as string[]).slice(3),
      }),
    );
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'share-failed',
      errorMessage: 'Server answered 503',
    });
    const all = sentIn(postEvents, 0).sent;
    expect(store.shared).toEqual({
      'session-1': { state: 'pending', recordingId: 'rec-1', ...OWNER },
    });
    expect(opened).toEqual([]);

    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
    const retry = sentIn(postEvents, 1);
    expect(retry.options.recordingId).toBe('rec-1');
    // the last snapshot event and the close, nothing delivered before
    expect(retry.sent).toEqual(all.slice(3));
    expect(store.shared).toEqual({
      'session-1': { state: 'shared', recordingId: 'rec-1' },
    });
    expect(store.unsent.size).toBe(0);
    expect(idsMade()).toBe(1);
  });

  it('refuses to resume a pending share for another organization, posting nothing', async () => {
    const { store, postEvents, sharing, request } = setup();
    postEvents.mockRejectedValueOnce(new Error('offline'));
    await sharing.share(request);
    expect(postEvents).toHaveBeenCalledTimes(1);

    const expected = {
      name: 'share-failed',
      errorMessage: PENDING_ELSEWHERE_ERROR('Acme'),
    };
    expect(PENDING_ELSEWHERE_ERROR('Acme')).toContain('Acme');
    // Switched to organization B, which the stored account now names.
    store.account = { ...ACCOUNT, orgId: 'org_2', orgName: 'Beta' };
    await expect(
      sharing.share({ ...request, orgId: 'org_2' }),
    ).resolves.toEqual(expected);
    expect(postEvents).toHaveBeenCalledTimes(1);
    expect(store.shared['session-1']).toMatchObject({
      state: 'pending',
      ...OWNER,
    });

    // Back in the original organization it finishes.
    store.account = ACCOUNT;
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
  });

  it('never makes a second recording for a session, even after a thrown error', async () => {
    const { store, postEvents, sharing, request, idsMade } = setup();
    postEvents.mockRejectedValueOnce(new Error('offline'));
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'share-failed',
      errorMessage: 'offline',
    });
    const all = sentIn(postEvents, 0).sent;
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
    // Nothing is known delivered, so all of it goes again, to rec-1.
    expect(sentIn(postEvents, 1).sent).toEqual(all);
    expect(
      postEvents.mock.calls.map(
        (call) => (call[0] as { recordingId: string }).recordingId,
      ),
    ).toEqual(['rec-1', 'rec-1']);
    expect(idsMade()).toBe(1);
    expect(store.shared).toEqual({
      'session-1': { state: 'shared', recordingId: 'rec-1' },
    });
  });

  it('resumes a share left pending by a worker restart', async () => {
    const { store, postEvents, sharing, restart, request, idsMade } = setup();
    // The worker stops while the first upload is in flight.
    postEvents.mockReturnValueOnce(new Promise(() => undefined));
    void sharing.share(request);
    await vi.waitFor(() => expect(postEvents).toHaveBeenCalledTimes(1));
    const all = sentIn(postEvents, 0).sent;
    expect(store.shared).toEqual({
      'session-1': { state: 'pending', recordingId: 'rec-1', ...OWNER },
    });

    await expect(restart().share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
    expect(sentIn(postEvents, 1).options.recordingId).toBe('rec-1');
    expect(sentIn(postEvents, 1).sent).toEqual(all);
    expect(idsMade()).toBe(1);
  });

  it('sends a pending share again in full, to the same recording, if its kept events are gone', async () => {
    const { store, postEvents, sharing, request, idsMade } = setup();
    store.shared = {
      'session-1': { state: 'pending', recordingId: 'rec-7', ...OWNER },
    };
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-7',
    });
    const { options, parsed } = sentIn(postEvents);
    expect(options.recordingId).toBe('rec-7');
    expect(parsed).toHaveLength(5);
    expect(idsMade()).toBe(0);
  });

  it('drops the kept events when the pending share cannot be stored', async () => {
    const { store, postEvents, writeShared, sharing, request } = setup();
    writeShared.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(sharing.share(request)).resolves.toMatchObject({
      name: 'share-failed',
      errorMessage: 'quota exceeded',
    });
    // Nothing points at them, so nothing may be left: deleting the session
    // would not find them.
    expect(store.unsent.size).toBe(0);
    expect(postEvents).not.toHaveBeenCalled();
  });

  it('answers shared when storing the shared state fails after delivery', async () => {
    const { store, postEvents, writeShared, sharing, request } = setup();
    const logged = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    writeShared.mockImplementation((shared) => {
      if (shared['session-1']?.state === 'shared')
        return Promise.reject(new Error('quota exceeded'));
      store.shared = shared;
      return Promise.resolve();
    });
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
    expect(logged).toHaveBeenCalled();

    // A second press, once storage works, sends nothing again.
    writeShared.mockImplementation((shared) => {
      store.shared = shared;
      return Promise.resolve();
    });
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
    expect(postEvents).toHaveBeenCalledTimes(1);
    expect(store.shared).toEqual({
      'session-1': { state: 'shared', recordingId: 'rec-1' },
    });
    logged.mockRestore();
  });

  it('refuses a session without a Meta event', async () => {
    const { store, postEvents, sharing, request } = setup([SNAPSHOT, CLICK]);
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'share-failed',
      errorMessage: NO_PAGE_ADDRESS_ERROR,
    });
    // A Meta event whose address has no hostname cannot be filed either.
    store.sessions.set('session-1', {
      events: [
        {
          ...META,
          data: { href: 'about:blank', width: 1, height: 1 },
        } as eventWithTime,
        CLICK,
      ],
      recorderVersion: '2.2.2',
    });
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'share-failed',
      errorMessage: NO_PAGE_ADDRESS_ERROR,
    });
    expect(postEvents).not.toHaveBeenCalled();
    expect(store.shared).toEqual({});

    // The same session shares once its events start with a page address.
    store.sessions.set('session-1', {
      events: [META, SNAPSHOT, CLICK],
      recorderVersion: '2.2.2',
    });
    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
  });

  it('rejects malformed share requests without throwing', async () => {
    const { postEvents, sharing, request } = setup();
    const malformed: unknown[] = [
      undefined,
      null,
      'session-1',
      42,
      {},
      { sessionId: 'session-1', userId: 'user_1' },
      { sessionId: '', orgId: 'org_1' },
      { sessionId: 'session-1', orgId: 7 },
      { sessionId: ['session-1'], orgId: 'org_1' },
    ];
    for (const value of malformed) {
      expect(parseShareRequest(value)).toBe('invalid');
      await expect(sharing.share(value)).resolves.toEqual({
        name: 'share-failed',
        errorMessage: INVALID_SHARE_ERROR,
      });
    }
    expect(postEvents).not.toHaveBeenCalled();
    expect(
      parseShareRequest({ sessionId: 's', userId: 'u', orgId: 'o', x: 1 }),
    ).toEqual({ sessionId: 's', orgId: 'o' });

    // A well formed request from the same channel still uploads.
    await expect(sharing.share(request)).resolves.toMatchObject({
      name: 'shared',
    });
    expect(postEvents).toHaveBeenCalledTimes(1);
  });
});

describe('uploading a cloud recording on Stop', () => {
  it('uploads to the account it started with, whatever is connected now, and opens nothing', async () => {
    const { store, opened, postEvents, sharing } = setup();
    store.account = null; // disconnected while recording
    await expect(sharing.uploadStopped('session-1', ACCOUNT)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
    const { options, parsed } = sentIn(postEvents);
    expect(options).toEqual({ publicKey: 'pk_acme', recordingId: 'rec-1' });
    expect(parsed[0]).toMatchObject({
      type: EventType.Custom,
      data: { tag: 'recording-meta' },
    });
    expect(parsed[parsed.length - 1]).toMatchObject({
      type: EventType.Custom,
      data: { tag: 'close-permanent' },
    });
    expect(opened).toEqual([]);
  });

  it('leaves a failed upload pending, for Share to finish in that organization', async () => {
    const { store, postEvents, sharing, request } = setup();
    postEvents.mockImplementationOnce((_options, events) =>
      Promise.resolve({
        state: 'not-delivered',
        error: new Error('Server answered 503'),
        unsent: (events as string[]).slice(2),
      }),
    );
    await expect(sharing.uploadStopped('session-1', ACCOUNT)).resolves.toEqual({
      name: 'share-failed',
      errorMessage: 'Server answered 503',
    });
    expect(store.shared).toEqual({
      'session-1': { state: 'pending', recordingId: 'rec-1', ...OWNER },
    });
    const all = sentIn(postEvents, 0).sent;

    await expect(sharing.share(request)).resolves.toEqual({
      name: 'shared',
      recordingId: 'rec-1',
    });
    expect(sentIn(postEvents, 1).sent).toEqual(all.slice(2));
  });
});

describe('deleting offline sessions that were shared', () => {
  const failFirstPost = (setupResult: ReturnType<typeof setup>) =>
    setupResult.postEvents.mockImplementationOnce((_options, events) =>
      Promise.resolve({
        state: 'not-delivered',
        error: new Error('Server answered 503'),
        unsent: events as string[],
      }),
    );

  it('removes the pending share, its kept events and the stored session', async () => {
    const s = setup();
    failFirstPost(s);
    await s.sharing.share(s.request);
    expect(s.store.unsent.size).toBe(1);

    await s.sharing.deleteSessions(['session-1']);

    expect(s.store.sessions.has('session-1')).toBe(false);
    expect(s.store.shared).toEqual({});
    expect(s.store.unsent.size).toBe(0);
    await expect(s.sharing.share(s.request)).resolves.toEqual({
      name: 'share-failed',
      errorMessage: SESSION_MISSING_ERROR,
    });
    expect(s.postEvents).toHaveBeenCalledTimes(1);
  });

  it('can retry a delete whose kept events failed to delete, without losing track of them', async () => {
    const s = setup();
    failFirstPost(s);
    await s.sharing.share(s.request);
    expect(s.store.unsent.size).toBe(1);

    s.store.failNextDeleteUnsent = true;
    await expect(s.sharing.deleteSessions(['session-1'])).rejects.toThrow(
      'IndexedDB is busy',
    );
    await s.sharing.deleteSessions(['session-1']);

    expect(s.store.unsent.size).toBe(0);
    expect(s.store.shared).toEqual({});
    expect(s.store.sessions.has('session-1')).toBe(false);
  });

  it('removes the shared-map entry of a shared session and keeps other sessions', async () => {
    const s = setup();
    await s.sharing.share(s.request);
    s.store.shared = {
      ...s.store.shared,
      other: { state: 'shared', recordingId: 'rec-x' },
    };
    await s.sharing.deleteSessions(['session-1']);
    expect(s.store.shared).toEqual({
      other: { state: 'shared', recordingId: 'rec-x' },
    });
  });

  it('refuses to resume a pending share whose session no longer exists', async () => {
    const s = setup();
    failFirstPost(s);
    await s.sharing.share(s.request);
    s.store.sessions.delete('session-1');
    await expect(s.sharing.share(s.request)).resolves.toEqual({
      name: 'share-failed',
      errorMessage: SESSION_MISSING_ERROR,
    });
    expect(s.postEvents).toHaveBeenCalledTimes(1);
  });

  it('stores nothing for a session deleted while its upload is in flight', async () => {
    const s = setup();
    let release: (r: UploadResult) => void = () => undefined;
    s.postEvents.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const sharing = s.sharing.share(s.request);
    await vi.waitFor(() => expect(s.postEvents).toHaveBeenCalledTimes(1));
    const deleting = s.sharing.deleteSessions(['session-1']);
    // A press during the deletion is refused.
    await expect(s.sharing.share(s.request)).resolves.toMatchObject({
      name: 'share-failed',
      errorMessage: SESSION_MISSING_ERROR,
    });
    release({ state: 'delivered' });
    await expect(sharing).resolves.toMatchObject({ name: 'share-failed' });
    await deleting;

    expect(s.store.shared).toEqual({});
    expect(s.store.unsent.size).toBe(0);
    expect(s.opened).toEqual([]);
  });

  it('stores nothing when the in-flight upload of a deleted session fails', async () => {
    const s = setup();
    let release: (r: UploadResult) => void = () => undefined;
    s.postEvents.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const sharing = s.sharing.share(s.request);
    await vi.waitFor(() => expect(s.postEvents).toHaveBeenCalledTimes(1));
    const deleting = s.sharing.deleteSessions(['session-1']);
    release({
      state: 'not-delivered',
      error: new Error('Server answered 503'),
      unsent: ['{}'],
    });
    await sharing;
    await deleting;
    expect(s.store.shared).toEqual({});
    expect(s.store.unsent.size).toBe(0);
  });
});
