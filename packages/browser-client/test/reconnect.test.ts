// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

type Listener = (socket: unknown, event: unknown) => void;

type QueueLike = {
  items: string[];
  add(value: string): void;
  clear(): void;
  length(): number;
  read(): string | undefined;
};

type MockSocket = {
  readyState: number;
  sent: string[];
  listeners: Record<string, Listener[]>;
  buffer: QueueLike;
  send(data: string): void;
  dispatch(type: string, event?: unknown): void;
  drop(): void;
  reopen(): void;
};

const mockState = vi.hoisted(() => ({
  sockets: [] as MockSocket[],
  emit: undefined as ((event: unknown) => void) | undefined,
}));

vi.mock('@rrweb/record', () => {
  const record = vi.fn((options: { emit?: (event: unknown) => void }) => {
    mockState.emit = options.emit;
    return vi.fn();
  });
  record.addCustomEvent = vi.fn();
  record.addAnnotation = vi.fn();
  record.freezePage = vi.fn();
  return { record };
});

vi.mock('websocket-ts', () => {
  class ArrayQueue {
    items: string[] = [];
    add(value: string) {
      this.items.push(value);
    }
    clear() {
      this.items = [];
    }
    length() {
      return this.items.length;
    }
    read() {
      return this.items.shift();
    }
  }

  class ExponentialBackoff {}

  class Websocket {
    readyState = 0;
    sent: string[] = [];
    listeners: Record<string, Listener[]> = {};
    closedByUser = false;
    constructor(readonly buffer: QueueLike) {}
    close() {
      this.closedByUser = true;
      this.readyState = 3;
    }
    addEventListener(type: string, listener: Listener) {
      (this.listeners[type] ??= []).push(listener);
    }
    send(data: string) {
      if (this.closedByUser) return;
      if (this.readyState === 1) {
        this.sent.push(data);
      } else {
        this.buffer.add(data);
      }
    }
    dispatch(type: string, event: unknown = {}) {
      (this.listeners[type] ?? []).forEach((listener) => listener(this, event));
    }
    drop() {
      this.readyState = 3;
      this.dispatch('close');
    }
    reopen() {
      this.readyState = 1;
      this.dispatch('open');
      for (
        let item = this.buffer.read();
        item !== undefined;
        item = this.buffer.read()
      ) {
        this.send(item);
      }
    }
  }

  class WebsocketBuilder {
    private buffer!: QueueLike;
    withBuffer(buffer: QueueLike) {
      this.buffer = buffer;
      return this;
    }
    withBackoff() {
      return this;
    }
    build() {
      const socket = new Websocket(this.buffer);
      mockState.sockets.push(socket as unknown as MockSocket);
      return socket;
    }
  }

  return {
    ArrayQueue,
    ExponentialBackoff,
    Websocket,
    WebsocketBuilder,
    WebsocketEvent: { open: 'open', message: 'message', close: 'close' },
  };
});

const event = (id: number) => ({ type: 3, timestamp: id, data: { id } });

function ids(payloads: string[]): number[] {
  return payloads
    .flatMap((payload) => payload.split('\n'))
    .map((line) => JSON.parse(line) as { data: { id?: number } })
    .map((parsed) => parsed.data.id)
    .filter((id): id is number => id !== undefined);
}

function deferredFetch() {
  let resolve!: (response: Response) => void;
  let reject!: (error: unknown) => void;
  const first = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const fetchMock = vi
    .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
    .mockReturnValueOnce(first)
    .mockImplementation(async () => new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);
  return {
    resolve,
    reject,
    urls: () => fetchMock.mock.calls.map(([url]) => String(url)),
    bodies: () => fetchMock.mock.calls.map(([, init]) => String(init?.body)),
  };
}

async function startClient() {
  vi.useFakeTimers();
  vi.resetModules();
  mockState.sockets = [];
  mockState.emit = undefined;
  const client = await import('../src/index');
  client.start({
    serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
    publicApiKey: 'public_key_rr_test',
  });
  const emit = mockState.emit!;
  emit(event(1));
  const [socket] = mockState.sockets;
  return { client, emit, socket };
}

describe('@rrweb/browser-client reconnect behaviour', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends events live again once a dropped socket reopens', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { emit, socket } = await startClient();
    socket.reopen();

    socket.drop();
    emit(event(2));
    expect(ids(socket.sent)).toEqual([1]);

    socket.reopen();
    expect(ids(socket.sent)).toEqual([1, 2]);

    emit(event(3));
    expect(ids(socket.sent)).toEqual([1, 2, 3]);
    expect(socket.buffer.length()).toBe(0);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs buffered events while the socket stays down', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000);
    emit(event(3));
    await vi.advanceTimersByTimeAsync(5000);

    expect(
      ids(fetchMock.mock.calls.map(([, init]) => String(init?.body))),
    ).toEqual([2, 3]);
    expect(socket.buffer.length()).toBe(0);
  });

  it('keeps POSTing after the server rejects the socket, even if it reopens', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();

    socket.dispatch('message', {
      data: JSON.stringify({ type: 'upstream-result', ok: false }),
    });
    socket.drop();
    socket.reopen();
    emit(event(2));
    expect(ids(socket.sent)).toEqual([1]);

    await vi.advanceTimersByTimeAsync(5000);
    expect(
      ids(fetchMock.mock.calls.map(([, init]) => String(init?.body))),
    ).toEqual([2]);
  });

  it('keeps events when a POST fails at the network level and retries with backoff', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    emit(event(3));
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(ids(socket.buffer.items)).toEqual([2, 3]);

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(ids([String(fetchMock.mock.calls[1][1]?.body)])).toEqual([2, 3]);
    expect(socket.buffer.length()).toBe(0);
  });

  it('delivers network-failed events over the socket when it reopens first', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000);
    socket.reopen();

    expect(ids(socket.sent)).toEqual([1, 2]);
  });

  it('sends requeued events over the socket without waiting for another reconnect', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000);
    socket.reopen();
    emit(event(3));
    expect(ids(socket.sent)).toEqual([1, 3]);

    post.reject(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(0);
    expect(ids(socket.buffer.items)).toEqual([2]);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(ids(socket.sent)).toEqual([1, 3, 2]);
    expect(socket.buffer.length()).toBe(0);
  });

  it('does not move events between recordings when a POST settles after stop()', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, emit, socket } = await startClient();
    socket.reopen();
    socket.drop();
    emit({ ...event(2), pad: 'x'.repeat(70_000) });
    emit(event(3));
    await vi.advanceTimersByTimeAsync(5000);
    const firstUrl = post.urls()[0];

    client.stop(true);
    await vi.advanceTimersByTimeAsync(0);
    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
    });
    mockState.emit!(event(10));
    const second = mockState.sockets[1];
    const bufferedForSecond = second.buffer.length();

    post.resolve(new Response(null, { status: 202 }));
    await vi.advanceTimersByTimeAsync(0);

    expect(second.buffer.length()).toBe(bufferedForSecond);
    expect(ids(second.buffer.items)).toEqual([10]);
    expect(post.urls().every((url) => url === firstUrl)).toBe(true);
  });

  it('does not requeue a failed POST into the next recording', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, emit, socket } = await startClient();
    socket.reopen();
    socket.drop();
    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000);

    client.stop(true);
    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
    });
    mockState.emit!(event(10));
    post.reject(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(0);

    const second = mockState.sockets[1];
    second.reopen();
    expect(ids(second.sent)).toEqual([10]);
  });

  it('does not move events between recordings when stop() follows a freeze', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, emit, socket } = await startClient();
    socket.reopen();
    socket.drop();
    emit({ ...event(2), pad: 'x'.repeat(70_000) });
    emit(event(3));
    await vi.advanceTimersByTimeAsync(5000);

    document.dispatchEvent(new Event('freeze'));
    client.stop(true);
    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
    });
    mockState.emit!(event(10));
    const second = mockState.sockets[mockState.sockets.length - 1];

    post.resolve(new Response(null, { status: 202 }));
    await vi.advanceTimersByTimeAsync(0);

    expect(post.urls()).toHaveLength(1);
    expect(ids(second.buffer.items)).toEqual([10]);
  });

  it('recovers when an error response body is not JSON or never finishes', async () => {
    const stuckBody = new Response(null, { status: 503 });
    vi.spyOn(stuckBody, 'text').mockReturnValue(new Promise(() => {}));
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(stuckBody)
        .mockResolvedValue(new Response(null, { status: 202 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000);
    socket.reopen();
    emit(event(3));
    await vi.advanceTimersByTimeAsync(2000);
    emit(event(4));

    expect(ids(socket.sent)).toEqual([1, 2, 3, 4]);
  });

  it('stops the fallback POST timer on stop()', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { client, socket } = await startClient();
    socket.reopen();

    client.stop(true);
    fetchMock.mockClear();
    socket.buffer.add(JSON.stringify(event(9)));
    await vi.advanceTimersByTimeAsync(120_000);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
