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
  addAnnotation: ReturnType<typeof vi.fn>;
  addCustomEvent: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  timestamp: number;
};

const mockState = vi.hoisted(
  (): MockState => ({
    buffers: [],
    addAnnotation: vi.fn(),
    addCustomEvent: vi.fn(),
    send: vi.fn(),
    timestamp: 100,
  }),
);

vi.mock('@rrweb/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@rrweb/utils')>()),
  nowTimestamp: () => mockState.timestamp,
}));

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
  record.addCustomEvent = mockState.addCustomEvent;
  record.addAnnotation = mockState.addAnnotation;
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
    send = mockState.send;
    close = vi.fn();
    addEventListener = vi.fn();
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
      return new Websocket();
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
  mockState.timestamp = 100;
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
  it('emits annotations immediately while recording', async () => {
    const client = await importFreshClient();
    const annotation = { type: 'caption', text: 'Save the project' } as const;

    expect(client.default).toHaveProperty(
      'addAnnotation',
      client.addAnnotation,
    );

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      emit: () => undefined,
    });
    client.addAnnotation(annotation);

    expect(mockState.addAnnotation).toHaveBeenCalledWith(annotation);
    expect(mockState.buffers[0].items).not.toContainEqual(
      expect.stringContaining('Save the project'),
    );
  });

  it.each(['function', 'global'])(
    'delivers queued custom events and annotations once through %s emit',
    async (callbackType) => {
      const client = await importFreshClient();
      const emit = vi.fn();
      const annotation = {
        type: 'timelineMarker' as const,
        text: 'Checkpoint',
      };
      const payload = { value: 1 };
      client.addCustomEvent('before-start', payload);
      client.addAnnotation(annotation);
      payload.value = 2;
      annotation.text = 'Changed after enqueue';
      expect(emit).not.toHaveBeenCalled();
      mockState.timestamp = 200;
      Object.defineProperty(window, 'queuedEventEmit', {
        configurable: true,
        value: emit,
      });
      client.start({
        serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
        publicApiKey: 'public_key_rr_test',
        includePii: false,
        emit: callbackType === 'function' ? emit : 'queuedEventEmit',
      });
      const expected = [
        {
          type: EventType.Custom,
          timestamp: 100,
          data: { tag: 'before-start', payload: { value: 1 } },
        },
        {
          type: EventType.Annotation,
          timestamp: 100,
          data: { type: 'timelineMarker', text: 'Checkpoint' },
        },
      ];
      expect(
        emit.mock.calls
          .map(([event]) => event)
          .filter((event) => event.type !== EventType.Meta),
      ).toEqual(expected);
      expect(
        mockState.send.mock.calls
          .map(([event]) => JSON.parse(event))
          .filter((event) => event.type !== EventType.Meta),
      ).toEqual(expected);
      expect(mockState.addAnnotation).not.toHaveBeenCalled();
      expect(mockState.addCustomEvent).not.toHaveBeenCalled();
      expect(
        mockState.buffers[0].items.map((item) => JSON.parse(item).data.tag),
      ).toEqual(['recording-meta']);
      client.stop(false);
      delete (window as unknown as Record<string, unknown>).queuedEventEmit;
    },
  );

  it('clears queued events on stop and delivers new events only to the next recording', async () => {
    const client = await importFreshClient();
    client.addCustomEvent('discarded', {});
    client.addAnnotation({ type: 'caption', text: 'Discarded' });
    client.stop(false);
    const emit = vi.fn();
    const options = {
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      emit,
    };
    client.start(options);
    expect(emit.mock.calls.map(([event]) => event.type)).toEqual([
      EventType.Meta,
    ]);
    client.stop(false);
    emit.mockClear();
    mockState.send.mockClear();
    client.addCustomEvent('next-session', {});
    client.addAnnotation({ type: 'caption', text: 'Next session' });
    client.start(options);
    expect(emit.mock.calls.map(([event]) => event.type)).toEqual([
      EventType.Meta,
      EventType.Custom,
      EventType.Annotation,
    ]);
    expect(mockState.send).toHaveBeenCalledTimes(3);
    client.stop(false);
  });

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
