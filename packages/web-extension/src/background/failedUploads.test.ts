import { describe, expect, it, vi } from 'vitest';
import type { DeliveryResult } from '@rrweb/browser-client';
import type { FailedUpload } from '~/types';
import {
  createFailedUploads,
  EVENTS_MISSING_ERROR,
  WRONG_USER_ERROR,
  type StoredUpload,
} from './failedUploads';

const EVENTS = ['{"meta":1}', '{"e":2}', '{"close":1}'];

function setup() {
  const store = {
    list: [] as FailedUpload[],
    uploads: new Map<string, StoredUpload>(),
    user: 'user_1' as string | null,
  };
  const opened: string[] = [];
  const postEvents = vi.fn(
    (): Promise<DeliveryResult> => Promise.resolve({ delivered: true }),
  );
  const getUpload = vi.fn((id: string) =>
    Promise.resolve(store.uploads.get(id)),
  );
  const deleteUpload = vi.fn((id: string) => {
    store.uploads.delete(id);
    return Promise.resolve();
  });
  const uploads = createFailedUploads({
    readList: () => Promise.resolve(store.list),
    writeList: (list) => {
      store.list = list;
      return Promise.resolve();
    },
    putUpload: (upload) => {
      store.uploads.set(upload.recordingId, upload);
      return Promise.resolve();
    },
    getUpload,
    deleteUpload,
    postEvents,
    openTab: (url) => {
      opened.push(url);
      return Promise.resolve();
    },
    currentUserId: () => Promise.resolve(store.user),
  });
  const keepOne = (
    recordingId = 'rec-1',
    title = 'Checkout',
    userId = 'user_1',
  ) =>
    uploads.keep({
      recordingId,
      userId,
      publicKey: 'pk_acme',
      title,
      unsent: EVENTS,
    });
  const states = () => store.list.map((u) => u.state);
  const inFlight = (postEventsMock: typeof postEvents) => {
    let release: () => void = () => undefined;
    postEventsMock.mockReturnValueOnce(
      new Promise((resolve) => {
        release = () => resolve({ delivered: true });
      }),
    );
    return () => release();
  };
  return {
    store,
    opened,
    postEvents,
    getUpload,
    deleteUpload,
    uploads,
    keepOne,
    states,
    inFlight,
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('failed uploads', () => {
  it('keeps the unsent events and lists the recording as upload-failed', async () => {
    const { store, keepOne } = setup();
    await keepOne();
    expect(store.list).toEqual([
      {
        recordingId: 'rec-1',
        userId: 'user_1',
        title: 'Checkout',
        state: { name: 'upload-failed' },
      },
    ]);
    expect(store.uploads.get('rec-1')).toEqual({
      recordingId: 'rec-1',
      publicKey: 'pk_acme',
      events: EVENTS,
    });
  });

  it('keeps every failed recording, not only the last', async () => {
    const { store, keepOne } = setup();
    await keepOne('rec-1', 'First');
    await keepOne('rec-2', 'Second');
    expect(store.list.map((u) => u.recordingId)).toEqual(['rec-1', 'rec-2']);
    expect([...store.uploads.keys()]).toEqual(['rec-1', 'rec-2']);
  });

  it('a delivered retry sends the same recording, forgets it and opens it', async () => {
    const { store, opened, postEvents, uploads, keepOne } = setup();
    await keepOne();
    await uploads.retry('rec-1');
    expect(postEvents).toHaveBeenCalledWith(
      {
        publicApiKey: 'pk_acme',
        recordingId: 'rec-1',
        serverUrl: 'https://api.rrweb.com/recordings/{recordingId}/events/ws',
      },
      EVENTS,
    );
    expect(store.list).toEqual([]);
    expect(store.uploads.size).toBe(0);
    expect(opened).toEqual(['https://app.rrweb.com/recordings/rec-1']);
  });

  it('a failed retry keeps only what is still unsent, names the error, and can be retried', async () => {
    const { store, opened, postEvents, uploads, keepOne, states } = setup();
    await keepOne();
    postEvents.mockResolvedValueOnce({
      delivered: false,
      error: new Error('Failed to fetch'),
      unsent: ['{"close":1}'],
    });
    await uploads.retry('rec-1');
    expect(states()).toEqual([
      { name: 'retry-failed', errorMessage: 'Failed to fetch' },
    ]);
    expect(store.uploads.get('rec-1')?.events).toEqual(['{"close":1}']);
    expect(opened).toEqual([]);
    await uploads.retry('rec-1');
    expect(postEvents).toHaveBeenLastCalledWith(expect.anything(), [
      '{"close":1}',
    ]);
    expect(store.list).toEqual([]);
  });

  it('shows retrying while a retry is in flight and ignores a second click', async () => {
    const { store, postEvents, uploads, keepOne, states, inFlight } = setup();
    await keepOne();
    const release = inFlight(postEvents);
    const first = uploads.retry('rec-1');
    await tick();
    expect(states()).toEqual([{ name: 'retrying' }]);
    await uploads.retry('rec-1');
    expect(postEvents).toHaveBeenCalledOnce();
    release();
    await first;
    expect(store.list).toEqual([]);
  });

  it('a retry that throws names the error, keeps the events and does not reject', async () => {
    const { store, getUpload, uploads, keepOne, states } = setup();
    await keepOne();
    getUpload.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    await expect(uploads.retry('rec-1')).resolves.toBeUndefined();
    expect(states()).toEqual([
      { name: 'retry-failed', errorMessage: 'IndexedDB unavailable' },
    ]);
    expect(store.uploads.has('rec-1')).toBe(true);
  });

  it('a retry with no kept events says so and sends nothing', async () => {
    const { store, postEvents, uploads, keepOne, states } = setup();
    await keepOne();
    store.uploads.clear();
    await uploads.retry('rec-1');
    expect(postEvents).not.toHaveBeenCalled();
    expect(states()).toEqual([
      { name: 'retry-failed', errorMessage: EVENTS_MISSING_ERROR },
    ]);
  });

  it('a delivered retry whose cleanup fails stays delivered and never POSTs again', async () => {
    const {
      store,
      opened,
      postEvents,
      deleteUpload,
      uploads,
      keepOne,
      states,
    } = setup();
    await keepOne();
    deleteUpload.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    await uploads.retry('rec-1');
    expect(states()).toEqual([{ name: 'delivered' }]);
    expect(opened).toEqual(['https://app.rrweb.com/recordings/rec-1']);
    await uploads.retry('rec-1'); // only cleans up
    expect(postEvents).toHaveBeenCalledOnce();
    expect(store.list).toEqual([]);
    expect(store.uploads.size).toBe(0);
  });

  it('only the user who made the recording can upload it', async () => {
    const { store, postEvents, uploads, keepOne, states } = setup();
    await keepOne();
    for (const user of [null, 'user_2']) {
      store.user = user;
      await uploads.retry('rec-1');
      expect(states()).toEqual([
        { name: 'retry-failed', errorMessage: WRONG_USER_ERROR },
      ]);
    }
    expect(postEvents).not.toHaveBeenCalled();
    store.user = 'user_1';
    await uploads.retry('rec-1');
    expect(postEvents).toHaveBeenCalledOnce();
  });

  it('after a worker restart a cut-short retry can be pressed again and a delivered one is cleaned up', async () => {
    const { store, uploads, keepOne, states } = setup();
    await keepOne('rec-1');
    await keepOne('rec-2');
    store.list = [
      { ...store.list[0], state: { name: 'retrying' } },
      { ...store.list[1], state: { name: 'delivered' } },
    ];
    await uploads.recoverAfterRestart();
    expect(states()).toEqual([{ name: 'upload-failed' }]);
    expect([...store.uploads.keys()]).toEqual(['rec-1']);
  });

  it('discard deletes the kept events, but not while a retry runs', async () => {
    const { store, postEvents, uploads, keepOne, inFlight } = setup();
    await keepOne('rec-1');
    await keepOne('rec-2');
    await uploads.discard('rec-1');
    expect(store.list.map((u) => u.recordingId)).toEqual(['rec-2']);
    expect([...store.uploads.keys()]).toEqual(['rec-2']);
    const release = inFlight(postEvents);
    const retrying = uploads.retry('rec-2');
    await tick();
    await uploads.discard('rec-2');
    expect(store.uploads.has('rec-2')).toBe(true);
    release();
    await retrying;
  });

  it("logging out forgets only that user's failed uploads", async () => {
    const { store, uploads, keepOne } = setup();
    await keepOne('rec-1', 'Mine', 'user_1');
    await keepOne('rec-2', 'Theirs', 'user_2');
    await uploads.forgetUser('user_1');
    expect(store.list.map((u) => u.recordingId)).toEqual(['rec-2']);
    expect([...store.uploads.keys()]).toEqual(['rec-2']);
  });

  it('a recording that fails after its user logged out keeps nothing', async () => {
    const { store, uploads, keepOne } = setup();
    await uploads.forgetUser('user_1');
    store.user = null;
    await keepOne('rec-1', 'Mine', 'user_1');
    await keepOne('rec-2', 'Theirs', 'user_2');
    expect(store.list.map((u) => u.recordingId)).toEqual(['rec-2']);
    expect([...store.uploads.keys()]).toEqual(['rec-2']);
  });

  it('a keep in flight when its user logs out keeps nothing', async () => {
    const { store, uploads, keepOne } = setup();
    const keeping = keepOne();
    const forgetting = uploads.forgetUser('user_1');
    store.user = null;
    await Promise.all([keeping, forgetting]);
    expect(store.list).toEqual([]);
    expect(store.uploads.size).toBe(0);
  });

  it('keeps failed uploads again once the same user logs back in', async () => {
    const { store, uploads, keepOne } = setup();
    await uploads.forgetUser('user_1');
    store.user = null;
    await keepOne('rec-1');
    store.user = 'user_1';
    await keepOne('rec-2');
    expect(store.list.map((u) => u.recordingId)).toEqual(['rec-2']);
    expect([...store.uploads.keys()]).toEqual(['rec-2']);
  });

  it('a retry that fails after its recording was forgotten leaves nothing behind', async () => {
    const { store, postEvents, uploads, keepOne } = setup();
    await keepOne();
    let fail: () => void = () => undefined;
    postEvents.mockReturnValueOnce(
      new Promise((resolve) => {
        fail = () =>
          resolve({
            delivered: false,
            error: new Error('Failed to fetch'),
            unsent: EVENTS,
          });
      }),
    );
    const retrying = uploads.retry('rec-1');
    await tick();
    await uploads.forgetUser('user_1'); // the person logs out meanwhile
    fail();
    await retrying;
    expect(store.list).toEqual([]);
    expect(store.uploads.size).toBe(0);
  });
});
