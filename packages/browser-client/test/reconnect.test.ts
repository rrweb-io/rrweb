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

  it('POSTs the close event when stop() runs before the socket first opens', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { client } = await startClient();

    client.stop(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = String(fetchMock.mock.calls[0][1]?.body);
    expect(body.split('\n').map((line) => JSON.parse(line))).toEqual([
      expect.objectContaining({
        data: { tag: 'close-permanent', payload: {} },
      }),
    ]);
  });

  it('POSTs the close event when stop() runs while the socket is down', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { client, socket } = await startClient();
    socket.reopen();
    socket.drop();

    client.stop(false);
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][1]?.body)).toContain(
      '"tag":"close-temporary"',
    );
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not POST on stop() when the close event went over an open socket', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { client, socket } = await startClient();
    socket.reopen();

    client.stop(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(socket.sent.at(-1)).toContain('"tag":"close-permanent"');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps POSTing later events while an earlier POST never answers', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000);
    expect(post.bodies()).toHaveLength(1);

    emit(event(3));
    // 30 s stall allowance, then the doubled 10 s delay.
    await vi.advanceTimersByTimeAsync(39_999);
    expect(post.bodies()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(post.bodies().map((body) => ids([body]))).toEqual([[2], [3]]);

    // The slow request is left running and its late answer does not start a
    // second tick loop: only the one scheduled tick is pending.
    post.resolve(new Response(null, { status: 202 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    emit(event(4));
    await vi.advanceTimersByTimeAsync(5000);
    expect(post.bodies().map((body) => ids([body]))).toEqual([[2], [3], [4]]);
    emit(event(5));
    await vi.advanceTimersByTimeAsync(5000);
    expect(post.bodies().map((body) => ids([body]))).toEqual([
      [2],
      [3],
      [4],
      [5],
    ]);
    expect(socket.buffer.length()).toBe(0);
  });

  it('requeues a stalled POST that later fails without losing newer events', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000);
    emit(event(3));
    await vi.advanceTimersByTimeAsync(40_000);
    expect(post.bodies().map((body) => ids([body]))).toEqual([[2], [3]]);

    post.reject(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(0);
    expect(ids(socket.buffer.items)).toEqual([2]);

    socket.reopen();
    expect(ids(socket.sent)).toEqual([1, 2]);
    expect(socket.buffer.length()).toBe(0);
  });

  it('counts a stalled POST once in the backoff when it later fails', async () => {
    let rejectFirst!: (error: unknown) => void;
    const postTimes: number[] = [];
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((_, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(async () => new Response(null, { status: 202 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();
    const startedAt = Date.now();
    vi.stubGlobal('fetch', (...args: Parameters<typeof fetch>) => {
      postTimes.push(Date.now() - startedAt);
      return fetchMock(...args);
    });

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000);
    emit(event(3));
    // Stalls at 35 s, so the next POST waits the doubled 10 s.
    await vi.advanceTimersByTimeAsync(35_000);
    // The stalled POST fails late. Its attempt was already counted.
    rejectFirst(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(0);
    // The 45 s POST fails: 10 s doubles to 20 s, so the next is at 65 s.
    await vi.advanceTimersByTimeAsync(25_000);

    expect(postTimes).toEqual([5000, 45_000, 65_000]);
    expect(
      ids(fetchMock.mock.calls.map(([, init]) => String(init?.body))),
    ).toEqual([2, 2, 3, 2, 3]);
    expect(socket.buffer.length()).toBe(0);
  });

  it('clears the stall timer of a hung POST on stop()', async () => {
    deferredFetch();
    const { client, emit, socket } = await startClient();
    socket.reopen();
    socket.drop();
    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000);

    client.stop(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(vi.getTimerCount()).toBe(0);
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

  it('stops a running recording when start() is called again without stop()', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const { client, socket } = await startClient();
    socket.reopen();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
    });
    mockState.emit!(event(5));
    const second = mockState.sockets[1];
    second.reopen();

    expect(socket.closedByUser).toBe(true);
    expect(socket.sent.some((sent) => sent.includes('close-temporary'))).toBe(
      true,
    );
    expect(second).not.toBe(socket);
    expect(ids(second.sent)).toContain(5);
    expect(ids(second.sent)).not.toContain(1);
  });
});
