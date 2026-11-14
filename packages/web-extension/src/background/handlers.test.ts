import { describe, expect, it, vi } from 'vitest';
import type { Runtime } from 'webextension-polyfill';
import { EventName, ServiceName } from '~/types';
import type { ShareResult } from '~/types';
import {
  BACKGROUND_NOT_READY_ERROR,
  registerHandlers,
  type BackgroundServices,
} from './handlers';

type Sender = Runtime.MessageSender;

/**
 * A channel that behaves like the browser while the worker wakes: a message
 * dispatched with no listener registered for it fails, as in Chrome.
 */
function fakeChannel() {
  const events = new Map<
    string,
    (detail: unknown, sender: Sender) => unknown
  >();
  const services = new Map<
    string,
    (params: unknown, sender: Sender) => Promise<unknown>
  >();
  const sender: Sender = { tab: { id: 7 } as Runtime.MessageSender['tab'] };
  return {
    channel: {
      on: (event: string, handler: (d: unknown, s: Sender) => unknown) => {
        events.set(event, handler);
        return () => undefined;
      },
      provide: (
        service: string,
        serve: (p: unknown, s: Sender) => Promise<unknown>,
      ) => {
        services.set(service, serve);
        return () => undefined;
      },
    },
    emit(event: string, detail: unknown) {
      const handler = events.get(event);
      if (!handler) throw new Error('Receiving end does not exist.');
      handler(detail, sender);
    },
    request(service: string, params: unknown) {
      const serve = services.get(service);
      if (!serve)
        return Promise.reject(new Error('Receiving end does not exist.'));
      return serve(params, sender);
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const SHARED: ShareResult = { name: 'shared', recordingId: 'rec_1' };

function fakeServices() {
  return {
    recorder: { start: vi.fn(async () => undefined) },
    sharing: {
      share: vi.fn(async () => SHARED),
      deleteSessions: vi.fn(async () => undefined),
    },
  };
}

describe('registerHandlers', () => {
  it('serves a message that arrives before the background is ready', async () => {
    const { channel, emit, request } = fakeChannel();
    const ready = deferred<BackgroundServices>();
    registerHandlers(channel, ready.promise, { shareEnabled: true });
    const services = fakeServices();

    // The waking messages, dispatched before any init await completes.
    emit(EventName.StartButtonClicked, { mode: 'offline' });
    const reply = request(ServiceName.ShareSession, { sessionId: 's1' });
    await Promise.resolve();
    expect(services.recorder.start).not.toHaveBeenCalled();

    ready.resolve(services as unknown as BackgroundServices);

    await expect(reply).resolves.toEqual(SHARED);
    expect(services.sharing.share).toHaveBeenCalledWith({ sessionId: 's1' });
    expect(services.recorder.start).toHaveBeenCalledWith({ mode: 'offline' });
  });

  it('answers Share with an error when the background cannot start', async () => {
    const { channel, emit, request } = fakeChannel();
    const ready = deferred<BackgroundServices>();
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerHandlers(channel, ready.promise, { shareEnabled: true });

    emit(EventName.StartButtonClicked, {});
    const reply = request(ServiceName.ShareSession, { sessionId: 's1' });
    ready.reject(new Error('storage unavailable'));

    await expect(reply).resolves.toEqual({
      name: 'share-failed',
      errorMessage: BACKGROUND_NOT_READY_ERROR,
    });
    await vi.waitFor(() =>
      expect(logged).toHaveBeenCalledWith(
        'Could not start recording:',
        expect.any(Error),
      ),
    );
    logged.mockRestore();
  });

  it('deletes sessions through the sharing service, with or without sharing', async () => {
    const { channel, request } = fakeChannel();
    const services = fakeServices();
    registerHandlers(channel, Promise.resolve(services as never), {
      shareEnabled: false,
    });
    await request(ServiceName.DeleteSessions, { sessionIds: ['a', 'b'] });
    expect(services.sharing.deleteSessions).toHaveBeenCalledWith(['a', 'b']);
    await expect(
      request(ServiceName.DeleteSessions, { sessionIds: 'a' }),
    ).rejects.toThrow();
  });
});
