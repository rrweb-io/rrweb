import { describe, expect, it, vi } from 'vitest';
import type { eventWithTime } from '@rrweb/types';
import {
  INVALID_START_ERROR,
  ACCOUNT_CHANGED_ERROR,
  ACCOUNT_NOT_SET_UP_ERROR,
  createSink,
  NO_HOSTNAME_ERROR,
  startRecording,
} from './sinks';
import type { DeliveryResult } from '@rrweb/browser-client';
import type { CloudAccount } from '~/types';

const account: CloudAccount = {
  userId: 'user_1',
  orgId: 'org_1',
  orgName: 'Acme',
  publicKey: 'pk_acme',
};
const cloud = { kind: 'cloud', account, domain: 'example.com' } as const;
/** What the signed-in popup sends for this account. */
const cloudRequest = {
  mode: 'cloud',
  userId: 'user_1',
  orgId: 'org_1',
} as const;
const event = (timestamp: number) => ({ timestamp } as eventWithTime);

function makeDeps() {
  const transport = {
    send: vi.fn(),
    flush: vi.fn(),
    disconnect: vi.fn(),
    stop: vi.fn(
      (): Promise<DeliveryResult> => Promise.resolve({ delivered: true }),
    ),
  };
  return {
    transport,
    deps: {
      createTransport: vi.fn(() => transport),
      addSession: vi.fn(() => Promise.resolve()),
      keepFailedUpload: vi.fn(() => Promise.resolve()),
      randomId: vi.fn(() => 'rec-1'),
      getURL: (path: string) => `chrome-extension://abc/${path}`,
      recorderVersion: '2.2.2',
    },
  };
}

describe('createSink', () => {
  it('cloud sink tags every recording chrome-extension', () => {
    const { deps } = makeDeps();
    createSink(cloud, deps);
    expect(deps.createTransport).toHaveBeenCalledOnce();
    const options = (
      deps.createTransport.mock.calls[0] as unknown as [
        {
          meta: Record<string, unknown>;
          publicApiKey: string;
          recordingId: string;
        },
      ]
    )[0];
    expect(options.meta.jsEntrypoint).toBe('chrome-extension');
    expect(options.meta.domain).toBe('example.com');
    expect(options.meta.includePii).toBe(false);
    expect(options.publicApiKey).toBe('pk_acme');
    expect(options.recordingId).toBe('rec-1');
  });

  it('cloud sink masks all inputs', () => {
    const { deps } = makeDeps();
    const sink = createSink(cloud, deps);
    expect(sink.kind).toBe('cloud');
    expect(sink.recordConfig.maskAllInputs).toBe(true);
    expect(sink.recordConfig.slimDOMOptions).toBe('all');
    expect(sink.recordConfig.inlineStylesheet).toBe(true);
    expect(sink.recordConfig.recordCrossOriginIframes).toBe(false);
  });

  it('cloud finish opens the dashboard recording', async () => {
    const { deps, transport } = makeDeps();
    const sink = createSink(cloud, deps);
    const result = await sink.finish('Title');
    expect(result).toEqual({
      state: 'delivered',
      openUrl: 'https://app.rrweb.com/recordings/rec-1',
    });
    expect(transport.stop).toHaveBeenCalledWith(true);
    expect(deps.addSession).not.toHaveBeenCalled();
    expect(deps.keepFailedUpload).not.toHaveBeenCalled();
  });

  it('cloud finish keeps the unsent events and opens nothing when the upload fails', async () => {
    const { deps, transport } = makeDeps();
    transport.stop.mockResolvedValue({
      delivered: false,
      error: new Error('Bad response from POST: 503'),
      unsent: ['{"meta":1}', '{"close":1}'],
    });
    const sink = createSink(cloud, deps);
    const result = await sink.finish('Checkout page');
    expect(result).toEqual({ state: 'upload-failed' });
    expect(deps.keepFailedUpload).toHaveBeenCalledWith({
      recordingId: 'rec-1',
      userId: 'user_1',
      publicKey: 'pk_acme',
      title: 'Checkout page',
      unsent: ['{"meta":1}', '{"close":1}'],
    });
  });

  it('cloud finish waits for the transport to deliver before returning', async () => {
    const { deps, transport } = makeDeps();
    let release: () => void = () => undefined;
    transport.stop.mockReturnValue(
      new Promise<DeliveryResult>((resolve) => {
        release = () => resolve({ delivered: true });
      }),
    );
    const sink = createSink(cloud, deps);
    let settled = false;
    const finishing = sink.finish('Title').then(() => {
      settled = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    await finishing;
    expect(settled).toBe(true);
  });

  it('offline sink never opens a transport', async () => {
    const { deps } = makeDeps();
    deps.randomId.mockReturnValue('sess-1');
    const sink = createSink({ kind: 'offline' }, deps);
    expect(sink.kind).toBe('offline');
    expect(sink.recordConfig).toEqual({ recordCrossOriginIframes: false });
    sink.add(event(1));
    sink.add(event(2));
    const finished = await sink.finish('My page');
    if (finished.state !== 'delivered') throw new Error('expected delivered');
    const { openUrl } = finished;
    expect(deps.createTransport).not.toHaveBeenCalled();
    expect(deps.addSession).toHaveBeenCalledOnce();
    const [session, events] = deps.addSession.mock.calls[0] as unknown as [
      { id: string; name: string; recorderVersion: string },
      eventWithTime[],
    ];
    expect(session).toMatchObject({
      id: 'sess-1',
      name: 'My page',
      recorderVersion: '2.2.2',
    });
    expect(events.map((e) => e.timestamp)).toEqual([1, 2]);
    expect(openUrl).toBe(
      'chrome-extension://abc/pages/index.html#/session/sess-1',
    );
  });

  it('cloud add forwards every event to one transport', () => {
    const { deps, transport } = makeDeps();
    const sink = createSink(cloud, deps);
    sink.add(event(1));
    sink.add(event(2));
    expect(deps.createTransport).toHaveBeenCalledOnce();
    expect(transport.send).toHaveBeenCalledTimes(2);
  });
  it('cloud flush forwards to the transport; offline flush has nothing to send', () => {
    const { deps, transport } = makeDeps();
    createSink(cloud, deps).flush();
    expect(transport.flush).toHaveBeenCalledOnce();
    const offline = makeDeps();
    expect(() =>
      createSink({ kind: 'offline' }, offline.deps).flush(),
    ).not.toThrow();
    expect(offline.deps.createTransport).not.toHaveBeenCalled();
  });
});

describe('startRecording', () => {
  it('uses the account read before the tab confirmed', async () => {
    const { deps } = makeDeps();
    let current: CloudAccount | null = account;
    const result = await startRecording({
      request: cloudRequest,
      getAccount: () => Promise.resolve(current),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart: () => {
        // the account changes while the tab is confirming
        current = { ...account, publicKey: 'pk_during_start' };
        return Promise.resolve({ startTimestamp: 5 });
      },
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    current = { ...account, publicKey: 'pk_after_start' };
    if (result.state !== 'started') throw new Error('expected started');
    result.sink.add(event(1));
    expect(deps.createTransport).toHaveBeenCalledOnce();
    expect(
      (
        deps.createTransport.mock.calls[0] as unknown as [
          { publicApiKey: string },
        ]
      )[0].publicApiKey,
    ).toBe('pk_acme');
  });

  it('asks the tab to record with the cloud masking options when signed in', async () => {
    const { deps } = makeDeps();
    const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
    await startRecording({
      request: cloudRequest,
      getAccount: () => Promise.resolve(account),
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

  it('asks the tab to record with rrweb defaults when signed out', async () => {
    const { deps } = makeDeps();
    const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
    await startRecording({
      request: { mode: 'offline' },
      getAccount: () => Promise.resolve(null),
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

  it('opens no transport when the tab refuses to record', async () => {
    const { deps } = makeDeps();
    const result = await startRecording({
      request: cloudRequest,
      getAccount: () => Promise.resolve(account),
      getTabUrl: () => Promise.resolve('chrome://extensions'),
      requestStart: () => Promise.reject(new Error('cannot record here')),
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    expect(result).toEqual({
      state: 'refused',
      errorMessage: 'cannot record here',
    });
    expect(deps.createTransport).not.toHaveBeenCalled();
  });
  it('refuses a cloud recording from an account stored without a user', async () => {
    const { deps } = makeDeps();
    const { userId: _, ...stored } = account;
    const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
    const result = await startRecording({
      request: cloudRequest,
      getAccount: () => Promise.resolve(stored as CloudAccount),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart,
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    expect(result).toEqual({
      state: 'refused',
      errorMessage: ACCOUNT_NOT_SET_UP_ERROR,
    });
    expect(requestStart).not.toHaveBeenCalled();
    expect(deps.createTransport).not.toHaveBeenCalled();
  });

  it('refuses a cloud recording before the tab starts when the tab has no hostname', async () => {
    for (const url of [undefined, 'about:blank', 'not a url']) {
      const { deps } = makeDeps();
      const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
      const result = await startRecording({
        request: cloudRequest,
        getAccount: () => Promise.resolve(account),
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
      expect(deps.createTransport).not.toHaveBeenCalled();
    }
  });

  it('still records offline on a tab with no hostname', async () => {
    const { deps } = makeDeps();
    const result = await startRecording({
      request: { mode: 'offline' },
      getAccount: () => Promise.resolve(null),
      getTabUrl: () => Promise.resolve(undefined),
      requestStart: () => Promise.resolve({ startTimestamp: 7 }),
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    expect(result).toMatchObject({ state: 'started', startTimestamp: 7 });
    if (result.state === 'started') expect(result.sink.kind).toBe('offline');
  });

  it('files the cloud recording under the tab hostname', async () => {
    const { deps } = makeDeps();
    const result = await startRecording({
      request: cloudRequest,
      getAccount: () => Promise.resolve(account),
      getTabUrl: () => Promise.resolve('https://shop.example.net/cart?x=1'),
      requestStart: () => Promise.resolve({ startTimestamp: 1 }),
      requestStop: () => Promise.resolve(),
      createSink: (target) => createSink(target, deps),
    });
    expect(result.state).toBe('started');
    expect(
      (
        deps.createTransport.mock.calls[0] as unknown as [
          { meta: { domain: string } },
        ]
      )[0].meta.domain,
    ).toBe('shop.example.net');
  });

  it('stops the tab again and reports the failure when the sink cannot be created', async () => {
    const order: string[] = [];
    const requestStop = vi.fn(() => {
      order.push('stop');
      return Promise.resolve();
    });
    const result = await startRecording({
      request: cloudRequest,
      getAccount: () => Promise.resolve(account),
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
      getAccount: () => Promise.resolve(account),
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
    const { deps } = makeDeps();
    const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
    const result = await startRecording({
      request: { mode: 'offline' },
      getAccount: () => Promise.resolve(account),
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
    expect(deps.createTransport).not.toHaveBeenCalled();
  });

  it('refuses a cloud start whose account no longer matches storage', async () => {
    const stored: (CloudAccount | null)[] = [
      { ...account, orgId: 'org_2' }, // another organization picked elsewhere
      { ...account, userId: 'user_2' }, // another user signed in
      null, // signed out in another view
    ];
    for (const current of stored) {
      const { deps } = makeDeps();
      const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
      const result = await startRecording({
        request: cloudRequest,
        getAccount: () => Promise.resolve(current),
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
      expect(deps.createTransport).not.toHaveBeenCalled();
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
      { mode: 'cloud', userId: 'user_1', orgId: 7 },
      { mode: 'cloud', userId: '', orgId: 'org_1' },
    ];
    for (const request of invalid) {
      const { deps } = makeDeps();
      const getAccount = vi.fn(() => Promise.resolve(account));
      const requestStart = vi.fn(() => Promise.resolve({ startTimestamp: 1 }));
      const result = await startRecording({
        request,
        getAccount,
        getTabUrl: () => Promise.resolve('https://example.com/a'),
        requestStart,
        requestStop: () => Promise.resolve(),
        createSink: (target) => createSink(target, deps),
      });
      expect(result).toEqual({
        state: 'refused',
        errorMessage: INVALID_START_ERROR,
      });
      expect(getAccount).not.toHaveBeenCalled();
      expect(requestStart).not.toHaveBeenCalled();
    }
  });

  it('does not stop the tab after a successful start', async () => {
    const { deps } = makeDeps();
    const requestStop = vi.fn(() => Promise.resolve());
    const result = await startRecording({
      request: cloudRequest,
      getAccount: () => Promise.resolve(account),
      getTabUrl: () => Promise.resolve('https://example.com/a'),
      requestStart: () => Promise.resolve({ startTimestamp: 1 }),
      requestStop,
      createSink: (target) => createSink(target, deps),
    });
    expect(result.state).toBe('started');
    expect(requestStop).not.toHaveBeenCalled();
  });
});
