// @vitest-environment happy-dom
import { EventType } from '@rrweb/types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QueueLike = {
  items: string[];
  add(value: string): void;
  clear(): void;
  length(): number;
  read(): string | undefined;
};

type MockState = {
  buffers: QueueLike[];
  lastRecordOptions?: Record<string, unknown>;
  lastWebsocketUrl?: string;
  socket?: {
    send: ReturnType<typeof vi.fn>;
    fire(name: string, data?: string): void;
  };
};

const mockState = vi.hoisted(
  (): MockState => ({
    buffers: [],
  }),
);

vi.mock('@rrweb/record', () => {
  const record = vi.fn((options: { emit?: (event: unknown) => void }) => {
    mockState.lastRecordOptions = options as Record<string, unknown>;
    options.emit?.({
      timestamp: 1,
      type: 4,
      data: {
        href: document.location.href,
        width: 1024,
        height: 768,
      },
    });
    return vi.fn();
  });
  record.addCustomEvent = vi.fn();
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

  class ExponentialBackoff {
    constructor(
      public readonly initial: number,
      public readonly exponent: number,
    ) {}
  }

  class Websocket {
    send = vi.fn();
    close = vi.fn();
    private listeners = new Map<
      string,
      Array<(socket: Websocket, event: { data?: string }) => void>
    >();
    addEventListener(
      name: string,
      listener: (socket: Websocket, event: { data?: string }) => void,
    ) {
      this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
    }
    fire(name: string, data?: string) {
      this.listeners.get(name)?.forEach((listener) => listener(this, { data }));
    }
  }

  class WebsocketBuilder {
    constructor(private readonly url: string) {}
    withBuffer(buffer: QueueLike) {
      mockState.buffers.push(buffer);
      return this;
    }
    withBackoff() {
      return this;
    }
    build() {
      mockState.lastWebsocketUrl = this.url;
      const socket = new Websocket();
      mockState.socket = socket;
      return socket;
    }
  }

  return {
    ArrayQueue,
    ExponentialBackoff,
    Websocket,
    WebsocketBuilder,
    WebsocketEvent: {
      open: 'open',
      message: 'message',
      close: 'close',
    },
  };
});

function packageVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(resolve(__dirname, '../package.json'), 'utf8'),
  ) as { version: string };
  return packageJson.version;
}

function setCurrentScript(script: HTMLScriptElement | null) {
  Object.defineProperty(document, 'currentScript', {
    configurable: true,
    value: script,
  });
}

async function importFreshClient() {
  vi.resetModules();
  mockState.buffers = [];
  mockState.lastRecordOptions = undefined;
  mockState.lastWebsocketUrl = undefined;
  return await import('../src/index');
}

function latestRecordingMetaPayload(): Record<string, unknown> {
  const [buffer] = mockState.buffers;
  expect(buffer).toBeDefined();
  const event = JSON.parse(buffer.items[0]) as {
    type: EventType;
    data: {
      tag: string;
      payload: Record<string, unknown>;
    };
  };
  expect(event.type).toBe(EventType.Custom);
  expect(event.data.tag).toBe('recording-meta');
  return event.data.payload;
}

function storedRecordingId(): string {
  const recordingId = sessionStorage.getItem(
    'rrweb-browser-client-recording-id',
  );
  expect(recordingId).toBeTruthy();
  return recordingId as string;
}

function expectBrowserClientDiagnostics(
  payload: Record<string, unknown>,
  expected: Record<string, unknown>,
) {
  expect(payload).toMatchObject({
    recordVersion: packageVersion(),
    recordCommitHash: expect.any(String),
    ...expected,
  });
  expect(payload.recordCommitHash).not.toBe('');
}

beforeEach(() => {
  sessionStorage.clear();
  document.body.innerHTML = '';
  setCurrentScript(null);
  window.history.replaceState({}, '', 'http://localhost/');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('@rrweb/browser-client load diagnostics', () => {
  it('adds programmatic diagnostics without jsSource by default', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });

    const payload = latestRecordingMetaPayload();
    expectBrowserClientDiagnostics(payload, {
      jsEntrypoint: 'programmatic',
    });
    expect(payload).not.toHaveProperty('jsSource');
  });

  it('uses the default api.rrweb.com endpoint for programmatic start without serverUrl', async () => {
    const client = await importFreshClient();

    client.start({
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });

    expect(mockState.lastWebsocketUrl).toBe(
      `wss://api.rrweb.com/recordings/${storedRecordingId()}/events/ws?token=public_key_rr_test`,
    );
  });

  it('uses an explicit serverUrl for programmatic start', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });

    expect(mockState.lastWebsocketUrl).toBe(
      `ws://localhost:8787/recordings/${storedRecordingId()}/events/ws?token=public_key_rr_test`,
    );
  });

  it('sanitizes explicit programmatic jsSource and strips diagnostics before record()', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      jsSource: 'https://example.com/recorder.js?token=secret#section',
      jsEntrypoint: 'internal-loader',
      emit: () => undefined,
    });

    expect(latestRecordingMetaPayload()).toMatchObject({
      jsSource: 'https://example.com/recorder.js',
      jsEntrypoint: 'internal-loader',
    });
    expect(mockState.lastRecordOptions).not.toHaveProperty('jsSource');
    expect(mockState.lastRecordOptions).not.toHaveProperty('jsEntrypoint');
  });

  it('uses script-tag diagnostics from currentScript', async () => {
    const script = document.createElement('script');
    script.src =
      'https://cdn.rrweb.com/browser-client/current/browser-client.umd.min.cjs?v=123#loaded';
    script.setAttribute('autostart', '');
    script.text = JSON.stringify({
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      emit: 'emitFnName',
    });
    (window as unknown as Record<string, unknown>).emitFnName = () => undefined;
    setCurrentScript(script);

    await importFreshClient();

    expectBrowserClientDiagnostics(latestRecordingMetaPayload(), {
      jsSource:
        'https://cdn.rrweb.com/browser-client/current/browser-client.umd.min.cjs',
      jsEntrypoint: 'script-tag',
    });
    expect(mockState.lastWebsocketUrl).toContain('wss://api.rrweb.com/');
  });

  it('uses data-rrweb-entrypoint for bookmarklet script loads', async () => {
    const script = document.createElement('script');
    script.src =
      'https://cdn.rrweb.com/browser-client/next/browser-client.umd.min.cjs';
    script.dataset.rrwebEntrypoint = 'bookmarklet';
    script.setAttribute('autostart', '');
    script.text = JSON.stringify({
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      emit: 'emitFnName',
    });
    (window as unknown as Record<string, unknown>).emitFnName = () => undefined;
    setCurrentScript(script);

    await importFreshClient();

    expect(latestRecordingMetaPayload()).toMatchObject({
      jsSource:
        'https://cdn.rrweb.com/browser-client/next/browser-client.umd.min.cjs',
      jsEntrypoint: 'bookmarklet',
    });
  });

  it('prevents user metadata from overriding diagnostics', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      meta: {
        recordVersion: 'wrong',
        recordCommitHash: 'wrong',
        jsEntrypoint: 'wrong',
        jsSource: 'https://wrong.example/recorder.js',
      },
      jsSource: 'https://example.com/right.js?token=secret#hash',
      jsEntrypoint: 'programmatic',
      emit: () => undefined,
    });

    expectBrowserClientDiagnostics(latestRecordingMetaPayload(), {
      jsSource: 'https://example.com/right.js',
      jsEntrypoint: 'programmatic',
    });
  });
});

describe('@rrweb/browser-client HTTP fallback batching', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function queueEvents() {
    vi.useFakeTimers();
    const client = await importFreshClient();
    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
    });
    const [buffer] = mockState.buffers;
    buffer.clear();
    const events = Array.from({ length: 5 }, (_, id) =>
      JSON.stringify({ id, payload: 'x'.repeat(30000) }),
    );
    events.forEach((event) => buffer.add(event));
    return { buffer };
  }

  it('uploads each queued event once across successful batches', async () => {
    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>(
      async () => new Response(null, { status: 202 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { buffer } = await queueEvents();

    await vi.advanceTimersByTimeAsync(5000);

    expect(
      fetchMock.mock.calls.map(([, init]) =>
        String(init?.body)
          .split('\n')
          .map((event) => JSON.parse(event).id),
      ),
    ).toEqual([
      [0, 1, 2],
      [3, 4],
    ]);
    expect(buffer.length()).toBe(0);
  });

  it('requeues only the failed batch, not earlier successful batches', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(new Response('{}', { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { buffer } = await queueEvents();

    await vi.advanceTimersByTimeAsync(5000);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(buffer.items.map((event) => JSON.parse(event).id)).toEqual([3, 4]);
  });

  it('requeues the failed batch ahead of events buffered during the request', async () => {
    const fetchMock = vi.fn(async () => {
      const [buffer] = mockState.buffers;
      buffer.add(JSON.stringify({ id: 99, payload: 'x'.repeat(30000) }));
      return new Response('{}', { status: 502 });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { buffer } = await queueEvents();

    await vi.advanceTimersByTimeAsync(5000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(buffer.items.map((event) => JSON.parse(event).id)).toEqual([
      0, 1, 2, 3, 4, 99,
    ]);
  });
});

describe('@rrweb/browser-client transport recovery', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function setup() {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>(
      async () => new Response(null, { status: 202 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = await importFreshClient();
    client.start({ publicApiKey: 'test' });
    const socket = mockState.socket!;
    const buffer = mockState.buffers[0];
    socket.fire('open');
    // websocket-ts drains its buffer on open; only test events after connection.
    buffer.clear();
    socket.send.mockClear();
    const emit = mockState.lastRecordOptions!.emit as (event: unknown) => void;
    const event = {
      type: 5,
      timestamp: 123,
      data: { tag: 'test', payload: {} },
    };
    return {
      client,
      socket,
      buffer,
      fetchMock,
      event,
      emit: () => emit(event),
    };
  }

  it('sends new events over the socket after reconnecting', async () => {
    const { socket, buffer, event, emit } = await setup();
    socket.fire('close');
    socket.fire('open');
    emit();
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify(event));
    expect(buffer.length()).toBe(0);
  });

  it.each(['close', 'server error', 'upstream failure'])(
    'POSTs events after %s on a previously open socket',
    async (failure) => {
      const { socket, fetchMock, event, emit } = await setup();
      if (failure === 'close') socket.fire('close');
      else
        socket.fire(
          'message',
          JSON.stringify(
            failure === 'server error'
              ? { type: 'error' }
              : { type: 'upstream-result', ok: false },
          ),
        );
      emit();
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify(event));
    },
  );

  it('keeps retrying fallback after an HTTP error', async () => {
    const { socket, fetchMock, event, emit } = await setup();
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    socket.fire('close');
    emit();
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify(event));
  });

  it('retains events for retry when the fallback network request rejects', async () => {
    const { socket, fetchMock, event, emit } = await setup();
    fetchMock.mockRejectedValueOnce(new TypeError('Network failure'));
    socket.fire('close');
    emit();
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify(event));
  });

  it('does not POST while the socket is healthy', async () => {
    const { fetchMock, emit } = await setup();
    emit();
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not overlap slow periodic POST requests', async () => {
    const { socket, fetchMock, emit } = await setup();
    let resolveRequest!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    socket.fire('close');
    emit();
    await vi.advanceTimersByTimeAsync(5000);
    emit();
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveRequest(new Response(null, { status: 202 }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('cleans up fallback polling when recording stops', async () => {
    const { client, socket } = await setup();
    socket.fire('close');
    client.stop(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('retries an in-flight failed POST even if the socket reconnected', async () => {
    const { socket, fetchMock, event, emit } = await setup();
    let rejectRequest!: (error: Error) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject;
        }),
    );
    socket.fire('close');
    emit();
    await vi.advanceTimersByTimeAsync(5000);
    socket.fire('open');
    rejectRequest(new TypeError('Network failure'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify(event));
  });
  it('ignores late events from a stopped socket after recording restarts', async () => {
    const { client, socket: oldSocket } = await setup();
    client.stop(false);
    client.start({ publicApiKey: 'test' });
    const socket = mockState.socket!;
    socket.fire('open');
    oldSocket.fire('close');
    oldSocket.fire('message', JSON.stringify({ type: 'error' }));
    socket.send.mockClear();
    const emit = mockState.lastRecordOptions!.emit as (event: unknown) => void;
    const event = {
      type: 5,
      timestamp: 456,
      data: { tag: 'restarted', payload: {} },
    };
    emit(event);
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify(event));
    client.stop(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
