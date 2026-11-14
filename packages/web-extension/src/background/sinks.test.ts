import { describe, expect, it, vi } from 'vitest';
import type { eventWithTime } from '@rrweb/types';
import {
  INVALID_START_ERROR,
  ACCOUNT_CHANGED_ERROR,
  createSink,
  NO_HOSTNAME_ERROR,
  startRecording,
} from './sinks';
import type { CloudAccount, Connection, ShareResult } from '~/types';

const account: CloudAccount = {
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};
const connected: Connection = { name: 'connected', account };
const notConnected: Connection = { name: 'not-connected' };
const cloud = { kind: 'cloud', account } as const;
/** What the connected popup sends for this account. */
const cloudRequest = { mode: 'cloud', orgId: 'org_1' } as const;
const event = (timestamp: number) => ({ timestamp } as eventWithTime);

function makeDeps() {
  return {
    addSession: vi.fn((_session: unknown, _events: eventWithTime[]) =>
      Promise.resolve(),
    ),
    uploadSession: vi.fn(
      (_sessionId: string, _account: CloudAccount): Promise<ShareResult> =>
        Promise.resolve({ name: 'shared', recordingId: 'rec-1' }),
    ),
    deleteSession: vi.fn((_sessionId: string) => Promise.resolve()),
    randomId: vi.fn(() => 'sess-1'),
    getURL: (path: string) => `chrome-extension://abc/${path}`,
    recorderVersion: '2.2.2',
  };
}

const LOCAL_URL = 'chrome-extension://abc/pages/index.html#/session/sess-1';

describe('createSink', () => {
  it('cloud sink masks all inputs', () => {
    const sink = createSink(cloud, makeDeps());
    expect(sink.kind).toBe('cloud');
    expect(sink.recordConfig.maskAllInputs).toBe(true);
    expect(sink.recordConfig.slimDOMOptions).toBe('all');
    expect(sink.recordConfig.inlineStylesheet).toBe(true);
    expect(sink.recordConfig.recordCrossOriginIframes).toBe(false);
  });

  it('offline finish stores the session and uploads nothing', async () => {
    const deps = makeDeps();
    const sink = createSink({ kind: 'offline' }, deps);
    expect(sink.kind).toBe('offline');
    expect(sink.recordConfig).toEqual({ recordCrossOriginIframes: false });
    sink.add(event(1));
    sink.add(event(2));
    const finished = await sink.finish('My page');
    expect(finished).toMatchObject({ state: 'saved', openUrl: LOCAL_URL });
    expect(deps.addSession).toHaveBeenCalledOnce();
    const [session, events] = deps.addSession.mock.calls[0];
    expect(session).toMatchObject({
      id: 'sess-1',
      name: 'My page',
      recorderVersion: '2.2.2',
      recordedAs: 'offline',
    });
    expect(events.map((e) => e.timestamp)).toEqual([1, 2]);
    expect(deps.uploadSession).not.toHaveBeenCalled();
    expect(deps.deleteSession).not.toHaveBeenCalled();
  });

  it('cloud finish stores the session, uploads it, then deletes the local copy', async () => {
    const deps = makeDeps();
    const order: string[] = [];
    deps.addSession.mockImplementation(async () => void order.push('store'));
    deps.uploadSession.mockImplementation(async () => {
      order.push('upload');
      return { name: 'shared', recordingId: 'rec-9' };
    });
    deps.deleteSession.mockImplementation(
      async () => void order.push('delete'),
    );
    const sink = createSink(cloud, deps);
    sink.add(event(1));
    const result = await sink.finish('Title');
    expect(result).toEqual({
      state: 'uploaded',
      openUrl: 'https://app.rrweb.com/recordings/rec-9',
    });
    expect(order).toEqual(['store', 'upload', 'delete']);
    expect(deps.uploadSession).toHaveBeenCalledWith('sess-1', account);
    expect(deps.deleteSession).toHaveBeenCalledWith('sess-1');
  });

  it('cloud finish keeps the stored session when the upload fails', async () => {
    const deps = makeDeps();
    deps.uploadSession.mockResolvedValue({
      name: 'share-failed',
      errorMessage: 'rrweb refused the upload (503)',
    });
    const sink = createSink(cloud, deps);
    const result = await sink.finish('Checkout page');
    expect(result).toMatchObject({
      state: 'upload-failed',
      openUrl: LOCAL_URL,
      errorMessage: 'rrweb refused the upload (503)',
      session: { id: 'sess-1', name: 'Checkout page' },
    });
    expect(deps.addSession).toHaveBeenCalledOnce();
    // Kept masked: Share must not warn about unmasked form fields.
    expect(deps.addSession.mock.calls[0][0]).toMatchObject({
      recordedAs: 'cloud',
    });
    expect(deps.deleteSession).not.toHaveBeenCalled();
  });

  it('cloud finish still opens the recording when the local copy cannot be deleted', async () => {
    const deps = makeDeps();
    deps.deleteSession.mockRejectedValue(new Error('storage busy'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await createSink(cloud, deps).finish('Title');
    expect(result).toEqual({
      state: 'uploaded',
      openUrl: 'https://app.rrweb.com/recordings/rec-1',
    });
    logged.mockRestore();
  });

  it('cloud finish waits for the upload before returning', async () => {
    const deps = makeDeps();
    let release: () => void = () => undefined;
    deps.uploadSession.mockReturnValue(
      new Promise<ShareResult>((resolve) => {
        release = () => resolve({ name: 'shared', recordingId: 'rec-1' });
      }),
    );
    const sink = createSink(cloud, deps);
    let settled = false;
    const finishing = sink.finish('Title').then(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(deps.uploadSession).toHaveBeenCalled());
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    await finishing;
    expect(settled).toBe(true);
  });

  it('a pause shift moves the stored events of a cloud recording too', async () => {
    const deps = makeDeps();
    const sink = createSink(cloud, deps);
    sink.add(event(10));
    sink.shiftEvents(5);
    await sink.finish('Title');
    expect(deps.addSession.mock.calls[0][1].map((e) => e.timestamp)).toEqual([
      15,
    ]);
  });
});

describe('startRecording', () => {
  it('uses the account read before the tab confirmed', async () => {
    const deps = makeDeps();
    let current: Connection = connected;
    const result = await startRecording({
      request: cloudRequest,
      getConnection: () => Promise.resolve(current),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart: () => {
        // the account changes while the tab is confirming
        current = {
          name: 'connected',
          account: { ...account, publicKey: 'pk_during_start' },
        };
        return Promise.resolve({ startTimestamp: 5 });
      },
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    current = {
      name: 'connected',
      account: { ...account, publicKey: 'pk_after_start' },
    };
    if (result.state !== 'started') throw new Error('expected started');
    result.sink.add(event(1));
    await result.sink.finish('Title');
    expect(deps.uploadSession).toHaveBeenCalledWith('sess-1', account);
  });

  it('asks the tab to record with the cloud masking options in Cloud mode', async () => {
    const deps = makeDeps();
    const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
    await startRecording({
      request: cloudRequest,
      getConnection: () => Promise.resolve(connected),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart,
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    expect(requestStart).toHaveBeenCalledWith({
      recordCrossOriginIframes: false,
      maskAllInputs: true,
      slimDOMOptions: 'all',
      inlineStylesheet: true,
    });
  });

  it('asks the tab to record with rrweb defaults offline', async () => {
    const deps = makeDeps();
    const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
    await startRecording({
      request: { mode: 'offline' },
      getConnection: () => Promise.resolve(notConnected),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart,
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    expect(requestStart).toHaveBeenCalledWith({
      recordCrossOriginIframes: false,
    });
    expect(requestStart.mock.calls[0]).toEqual([
      { recordCrossOriginIframes: false },
    ]);
  });

  it('creates no sink when the tab refuses to record', async () => {
    const createSinkSpy = vi.fn();
    const result = await startRecording({
      request: cloudRequest,
      getConnection: () => Promise.resolve(connected),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart: () => Promise.reject(new Error('cannot record here')),
      requestStop: () => Promise.resolve(),
      createSink: createSinkSpy,
    });
    expect(result).toEqual({
      state: 'refused',
      errorMessage: 'cannot record here',
    });
    expect(createSinkSpy).not.toHaveBeenCalled();
  });
  it('refuses a cloud recording before the tab starts when the tab has no hostname', async () => {
    for (const url of [undefined, 'about:blank', 'not a url']) {
      const deps = makeDeps();
      const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
      const result = await startRecording({
        request: cloudRequest,
        getConnection: () => Promise.resolve(connected),
        getTabUrl: () => Promise.resolve(url),
        requestStart,
        requestStop: () => Promise.resolve(),
        createSink: (target) => createSink(target, deps),
      });
      expect(result).toEqual({
        state: 'refused',
        errorMessage: NO_HOSTNAME_ERROR,
      });
      expect(requestStart).not.toHaveBeenCalled();
    }
  });

  it('still records offline on a tab with no hostname', async () => {
    const deps = makeDeps();
    const result = await startRecording({
      request: { mode: 'offline' },
      getConnection: () => Promise.resolve(notConnected),
      getTabUrl: () => Promise.resolve(undefined),
      requestStart: () => Promise.resolve({ startTimestamp: 7 }),
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    expect(result).toMatchObject({ state: 'started', startTimestamp: 7 });
    if (result.state === 'started') expect(result.sink.kind).toBe('offline');
  });

  it('stops the tab again and reports the failure when the sink cannot be created', async () => {
    const order: string[] = [];
    const requestStop = vi.fn(() => {
      order.push('stop');
      return Promise.resolve();
    });
    const result = await startRecording({
      request: cloudRequest,
      getConnection: () => Promise.resolve(connected),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart: () => {
        order.push('start');
        return Promise.resolve({ startTimestamp: 1 });
      },
      requestStop,
      createSink: () => {
        throw new Error('no transport');
      },
    });
    expect(result).toEqual({ state: 'failed', errorMessage: 'no transport' });
    expect(order).toEqual(['start', 'stop']);
  });

  it('reports the sink failure even when the tab cannot be stopped', async () => {
    const result = await startRecording({
      request: cloudRequest,
      getConnection: () => Promise.resolve(connected),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart: () => Promise.resolve({ startTimestamp: 1 }),
      requestStop: () => Promise.reject(new Error('tab closed')),
      createSink: () => {
        throw new Error('no transport');
      },
    });
    expect(result).toEqual({ state: 'failed', errorMessage: 'no transport' });
  });

  it('records offline when the popup asked for offline, even with an account stored', async () => {
    const deps = makeDeps();
    const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
    const result = await startRecording({
      request: { mode: 'offline' },
      getConnection: () => Promise.resolve(connected),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart,
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    if (result.state !== 'started') throw new Error('expected started');
    expect(result.sink.kind).toBe('offline');
    expect(requestStart).toHaveBeenCalledWith({
      recordCrossOriginIframes: false,
    });
  });

  it('refuses a cloud start whose organization is no longer connected', async () => {
    const stored: Connection[] = [
      // another organization connected from the dashboard
      { name: 'connected', account: { ...account, orgId: 'org_2' } },
      notConnected, // disconnected in another view
    ];
    for (const current of stored) {
      const deps = makeDeps();
      const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
      const result = await startRecording({
        request: cloudRequest,
        getConnection: () => Promise.resolve(current),
        getTabUrl: () => Promise.resolve('https://example.com/a'),
        requestStart,
        requestStop: () => Promise.resolve(),
        createSink: (target) => createSink(target, deps),
      });
      expect(result).toEqual({
        state: 'refused',
        errorMessage: ACCOUNT_CHANGED_ERROR,
      });
      expect(requestStart).not.toHaveBeenCalled();
    }
  });

  it('refuses a start request that names no valid destination, without throwing', async () => {
    const invalid: unknown[] = [
      undefined,
      null,
      {},
      'offline',
      { mode: 'upload' },
      { mode: 'cloud' },
      { mode: 'cloud', userId: 'user_1' },
      { mode: 'cloud', orgId: 7 },
      { mode: 'cloud', orgId: '' },
    ];
    for (const request of invalid) {
      const deps = makeDeps();
      const getConnection = vi.fn(() => Promise.resolve(connected));
      const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
      const result = await startRecording({
        request,
        getConnection,
        getTabUrl: () => Promise.resolve('https://example.com/a'),
        requestStart,
        requestStop: () => Promise.resolve(),
        createSink: (target) => createSink(target, deps),
      });
      expect(result).toEqual({
        state: 'refused',
        errorMessage: INVALID_START_ERROR,
      });
      expect(getConnection).not.toHaveBeenCalled();
      expect(requestStart).not.toHaveBeenCalled();
    }
  });

  it('does not stop the tab after a successful start', async () => {
    const deps = makeDeps();
    const requestStop = vi.fn(() => Promise.resolve());
    const result = await startRecording({
      request: cloudRequest,
      getConnection: () => Promise.resolve(connected),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart: () => Promise.resolve({ startTimestamp: 1 }),
      requestStop,
      createSink: (target) => createSink(target, deps),
    });
    expect(result.state).toBe('started');
    expect(requestStop).not.toHaveBeenCalled();
  });
});
