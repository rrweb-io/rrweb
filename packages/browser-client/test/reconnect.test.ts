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

// Mirrors the parts of websocket-ts the client relies on: `send` buffers
// unless the socket is open, and the buffer is flushed after `open` listeners.
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

// fetch whose first call stays pending until the test settles it
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
    signals: () => fetchMock.mock.calls.map(([, init]) => init?.signal),
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
  emit(event(1)); // the first event creates the socket
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
    expect(fetchMock).toHaveBeenCalledTimes(1); // backed off to 10s

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

  it('sends requeued events over a reopened socket when the POST fails late', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000); // POST takes event 2
    socket.reopen();
    emit(event(3));
    post.reject(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(0);
    emit(event(4));

    expect(ids(socket.sent)).toEqual([1, 2, 3, 4]);
    expect(socket.buffer.length()).toBe(0);
  });

  it('keeps newer events behind a fallback POST that is still in flight', async () => {
    const post = deferredFetch();
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000); // POST takes event 2
    emit(event(3));
    socket.reopen();
    emit(event(4));
    expect(ids(socket.sent)).toEqual([1]); // nothing overtakes event 2

    post.resolve(new Response(null, { status: 202 }));
    await vi.advanceTimersByTimeAsync(0);
    emit(event(5));

    expect(ids(post.bodies())).toEqual([2]);
    expect(ids(socket.sent)).toEqual([1, 3, 4, 5]);
  });

  it('does not move events between recordings when a POST settles after stop()', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, emit, socket } = await startClient();
    socket.reopen();
    socket.drop();
    // two batches: more than the 65 KB keepalive limit
    emit({ ...event(2), pad: 'x'.repeat(70_000) });
    emit(event(3));
    await vi.advanceTimersByTimeAsync(5000); // POST takes event 2
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

    // the old POST neither drained the new recording's buffer nor refilled it
    expect(second.buffer.length()).toBe(bufferedForSecond);
    expect(ids(second.buffer.items)).toEqual([10]);
    expect(
      post.urls().filter((url, i) => i > 0 && url === firstUrl),
    ).toHaveLength(1); // only stop()'s close event went to the old recording
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
    await vi.advanceTimersByTimeAsync(5000); // POST takes event 2

    document.dispatchEvent(new Event('freeze')); // drops the socket
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

  it('stops waiting for a slow POST after 30s without cancelling it', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000); // POST takes event 2 and stalls
    socket.reopen();
    emit(event(3));
    expect(ids(socket.sent)).toEqual([1]);

    await vi.advanceTimersByTimeAsync(30_000);
    emit(event(4));
    expect(ids(socket.sent)).toEqual([1, 3, 4]);
    expect(post.signals().every((signal) => !signal)).toBe(true);

    // the slow POST then fails: its events come back and go over the socket
    post.reject(new TypeError('Failed to fetch'));
    await vi.advanceTimersByTimeAsync(0);
    expect(ids(socket.sent)).toEqual([1, 3, 4, 2]);
    expect(post.urls()).toHaveLength(1);
  });

  it('keeps a slow POST alive when stop() follows its timeout', async () => {
    const post = deferredFetch();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = await startClient(); // socket still connecting

    await vi.advanceTimersByTimeAsync(5000); // POST takes the buffer
    await vi.advanceTimersByTimeAsync(30_000); // gives up waiting
    client.stop(true);
    post.resolve(new Response(null, { status: 202 }));
    await vi.advanceTimersByTimeAsync(0);

    expect(post.signals().every((signal) => !signal)).toBe(true);
    expect(ids([post.bodies()[0]])).toEqual([1]);
  });

  it('sends events withheld behind a pending POST when stop() is called', async () => {
    const post = deferredFetch();
    const { client, emit, socket } = await startClient();
    socket.reopen();
    socket.drop();

    emit(event(2));
    await vi.advanceTimersByTimeAsync(5000); // POST takes event 2
    emit(event(3));
    socket.reopen(); // event 3 is held behind the POST
    emit(event(4));

    client.stop(true);
    post.resolve(new Response(null, { status: 202 }));
    await vi.advanceTimersByTimeAsync(0);

    expect(ids(socket.sent)).toEqual([1, 3, 4]);
    expect(socket.sent.some((sent) => sent.includes('close-permanent'))).toBe(
      true,
    );
    expect(ids(post.bodies())).toEqual([2]);
  });

  it('resumes the socket when an error response body never finishes', async () => {
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
    await vi.advanceTimersByTimeAsync(5000); // POST gets a 503
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
