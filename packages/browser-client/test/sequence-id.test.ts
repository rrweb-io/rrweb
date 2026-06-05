// @vitest-environment happy-dom
import { EventType } from '@rrweb/types';
import type { RecordPlugin } from '@rrweb/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QueueLike = {
  items: string[];
  add(value: string): void;
  clear(): void;
  length(): number;
  read(): string | undefined;
};

type WebsocketLike = {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

type MockState = {
  buffers: QueueLike[];
  recordCalls: Array<Record<string, unknown>>;
  websockets: WebsocketLike[];
  hidden: boolean;
  pluginOptions: Array<Record<string, unknown>>;
  operations: string[];
};

const mockState = vi.hoisted(
  (): MockState => ({
    buffers: [],
    recordCalls: [],
    websockets: [],
    hidden: false,
    pluginOptions: [],
    operations: [],
  }),
);

vi.mock('@rrweb/rrweb-plugin-sequential-id-record', () => {
  function isPositiveInteger(value: unknown): value is number {
    return Number.isInteger(value) && value > 0;
  }

  return {
    getRecordSequentialIdPlugin: vi.fn((options: Record<string, unknown>) => {
      mockState.operations.push('plugin:create');
      mockState.pluginOptions.push(options);
      let id = Number(options.startId) || 0;
      const plugin: RecordPlugin = {
        name: 'rrweb/sequential-id@1',
        options,
        eventProcessor(event) {
          const current = (event as Record<string, unknown>)[
            String(options.key)
          ];
          if (options.preserveExisting && isPositiveInteger(current)) {
            id = Math.max(id, current);
            return event;
          }
          Object.assign(event, { [String(options.key)]: ++id });
          return event;
        },
      };
      return plugin;
    }),
  };
});

vi.mock('@rrweb/record', () => {
  const record = vi.fn((options: Record<string, unknown>) => {
    mockState.recordCalls.push(options);
    const event = {
      timestamp: 1,
      type: EventType.Meta,
      data: {
        href: document.location.href,
        width: 1024,
        height: 768,
      },
    };
    const plugins = (options.plugins || []) as RecordPlugin[];
    const processed = plugins.reduce(
      (acc, plugin) => plugin.eventProcessor?.(acc) || acc,
      event,
    );
    (options.emit as (event: unknown) => void)?.(processed);
    return vi.fn();
  });
  record.addCustomEvent = vi.fn();
  record.freezePage = vi.fn();
  return { record };
});

vi.mock('websocket-ts', () => {
  class ArrayQueue {
    items: string[] = [];
    constructor() {
      mockState.buffers.push(this);
    }
    add(value: string) {
      mockState.operations.push('buffer:add');
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
    addEventListener = vi.fn();
  }

  class WebsocketBuilder {
    constructor(private readonly url: string) {}
    withBuffer(buffer: QueueLike) {
      if (!mockState.buffers.includes(buffer)) {
        mockState.buffers.push(buffer);
      }
      return this;
    }
    withBackoff() {
      return this;
    }
    build() {
      const ws = new Websocket();
      mockState.websockets.push(ws);
      return ws;
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

function setDocumentHidden(value: boolean) {
  mockState.hidden = value;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => mockState.hidden,
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (mockState.hidden ? 'hidden' : 'visible'),
  });
}

async function importFreshClient() {
  vi.resetModules();
  mockState.buffers = [];
  mockState.recordCalls = [];
  mockState.websockets = [];
  mockState.pluginOptions = [];
  mockState.operations = [];
  return await import('../src/index');
}

function recordingId(): string {
  const value = sessionStorage.getItem('rrweb-browser-client-recording-id');
  expect(value).toBeTruthy();
  return value as string;
}

function sequenceKey() {
  return `rrweb-browser-client-sequence-id:${recordingId()}`;
}

function bufferEvents() {
  return mockState.buffers.flatMap((buffer) =>
    buffer.items.map((item) => JSON.parse(item) as Record<string, unknown>),
  );
}

function sentEvents() {
  return mockState.websockets.flatMap((ws) =>
    ws.send.mock.calls.map(
      ([payload]) => JSON.parse(String(payload)) as Record<string, unknown>,
    ),
  );
}

beforeEach(() => {
  sessionStorage.clear();
  document.body.innerHTML = '';
  setDocumentHidden(false);
  window.history.replaceState({}, '', 'http://localhost/');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('@rrweb/browser-client sequenceId', () => {
  it('assigns recording-meta before constructing the rrweb plugin', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });

    expect(bufferEvents()[0]).toMatchObject({
      type: EventType.Custom,
      data: { tag: 'recording-meta' },
      sequenceId: 1,
    });
    expect(mockState.operations.slice(0, 2)).toEqual([
      'buffer:add',
      'plugin:create',
    ]);
    expect(mockState.pluginOptions[0]).toMatchObject({
      key: 'sequenceId',
      startId: 1,
      preserveExisting: true,
    });
    expect(sentEvents()[0]).toMatchObject({ sequenceId: 2 });
    expect(sessionStorage.getItem(sequenceKey())).toBe('2');
  });

  it('overwrites stale user plugin sequence ids during final normalization', async () => {
    const client = await importFreshClient();
    const emittedEvents: Array<Record<string, unknown>> = [];
    const staleSequencePlugin: RecordPlugin = {
      name: 'test/stale-sequence-id',
      eventProcessor(event) {
        Object.assign(event, { sequenceId: 1 });
        return event;
      },
    };

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: (event) => emittedEvents.push(event as Record<string, unknown>),
      plugins: [staleSequencePlugin],
    });

    expect(bufferEvents()[0]).toMatchObject({ sequenceId: 1 });
    expect(emittedEvents[0]).toMatchObject({ sequenceId: 2 });
    expect(sentEvents()[0]).toMatchObject({ sequenceId: 2 });
    expect(sessionStorage.getItem(sequenceKey())).toBe('2');
  });

  it('continues from stored sequence state on resume', async () => {
    const client = await importFreshClient();
    sessionStorage.setItem('rrweb-browser-client-recording-id', 'recording-1');
    sessionStorage.setItem(
      'rrweb-browser-client-sequence-id:recording-1',
      '41',
    );

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });

    expect(bufferEvents()[0]).toMatchObject({ sequenceId: 42 });
    expect(mockState.pluginOptions[0]).toMatchObject({ startId: 42 });
    expect(sentEvents()[0]).toMatchObject({ sequenceId: 43 });
    expect(sessionStorage.getItem(sequenceKey())).toBe('43');
  });

  it('recovers malformed stored sequence state by assigning 1', async () => {
    const client = await importFreshClient();
    sessionStorage.setItem('rrweb-browser-client-recording-id', 'recording-1');
    sessionStorage.setItem(
      'rrweb-browser-client-sequence-id:recording-1',
      'bad',
    );

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });

    expect(bufferEvents()[0]).toMatchObject({ sequenceId: 1 });
  });

  it('assigns ids to fallback custom events before recording is active', async () => {
    const client = await importFreshClient();

    client.addCustomEvent('pre-start', { ok: true });

    expect(bufferEvents()[0]).toMatchObject({
      type: EventType.Custom,
      sequenceId: 1,
      data: {
        tag: 'pre-start',
      },
    });
    expect(sessionStorage.getItem(sequenceKey())).toBe('1');
  });

  it('does not buffer fallback custom events without sequence state', async () => {
    const client = await importFreshClient();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('sessionStorage unavailable');
      });

    client.addCustomEvent('pre-start', { ok: true });

    expect(bufferEvents()).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      '@rrweb/browser-client: Unable to addCustomEvent(); sessionStorage unavailable',
    );

    getItem.mockRestore();
    consoleError.mockRestore();
  });

  it('assigns ids to close events and clears state on permanent stop', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });
    const key = sequenceKey();

    client.stop(true);

    expect(sentEvents().at(-1)).toMatchObject({
      sequenceId: 3,
      data: {
        tag: 'close-permanent',
      },
    });
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('does not throw on permanent stop when recording id cleanup storage fails', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });
    const removeItem = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('sessionStorage unavailable');
      });

    expect(() => client.stop(true)).not.toThrow();

    removeItem.mockRestore();
  });

  it('does not record after permanent stop cancels a hidden delayed start', async () => {
    setDocumentHidden(true);
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });
    client.stop(true);

    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockState.recordCalls).toHaveLength(0);
  });

  it('does not restart recording after permanent stop cancels a frozen start', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });
    document.dispatchEvent(new Event('freeze'));
    client.stop(true);

    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockState.recordCalls).toHaveLength(1);
  });

  it('builds the plugin from latest state after delayed visible start', async () => {
    setDocumentHidden(true);
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });
    client.addCustomEvent('queued-while-hidden', {});

    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(bufferEvents().map((event) => event.sequenceId)).toEqual([1, 2]);
    expect(mockState.pluginOptions[0]).toMatchObject({ startId: 2 });
    expect(sentEvents()[0]).toMatchObject({ sequenceId: 3 });
  });

  it('builds a fresh plugin after freeze restart without accumulating browser-client plugins', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });
    document.dispatchEvent(new Event('freeze'));
    client.addCustomEvent('between-records', {});
    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockState.pluginOptions).toHaveLength(2);
    expect(mockState.pluginOptions[1]).toMatchObject({ startId: 3 });
    for (const call of mockState.recordCalls) {
      const plugins = call.plugins as RecordPlugin[];
      expect(
        plugins.filter((plugin) => plugin.name === 'rrweb/sequential-id@1'),
      ).toHaveLength(1);
    }
  });
});
