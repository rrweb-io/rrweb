// @vitest-environment happy-dom
import { EventType } from '@rrweb/types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';

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
