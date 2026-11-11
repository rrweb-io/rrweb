import { EventType } from '@rrweb/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Every record() call emits one full snapshot straight away.
vi.mock('@rrweb/record', () => {
  const record = Object.assign(
    vi.fn((options: { emit: (event: unknown) => void }) => {
      options.emit({ type: EventType.FullSnapshot, data: {}, timestamp: 1 });
      return () => undefined;
    }),
    { addCustomEvent: vi.fn(), freezePage: vi.fn() },
  );
  return { record };
});

/** A socket that never opens, as on a slow or offline network. */
class ConnectingWebSocket extends EventTarget {
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  readyState = 0;
  binaryType = 'blob';
  constructor(public url: string) {
    super();
  }
  send() {
    throw new Error('not open');
  }
  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event('close'));
  }
}

describe('start() called again while the first socket is connecting', () => {
  const realWebSocket = globalThis.WebSocket;
  afterEach(() => {
    globalThis.WebSocket = realWebSocket;
    vi.unstubAllGlobals();
  });

  it('still delivers what the first start buffered', async () => {
    globalThis.WebSocket = ConnectingWebSocket as unknown as typeof WebSocket;
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('document', {
      hidden: false,
      readyState: 'complete',
      location: { hostname: 'example.com', href: 'https://example.com/' },
      addEventListener: vi.fn(),
    });
    vi.stubGlobal('sessionStorage', {
      getItem: () => 'rec-1',
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const client = await import('../src/index');
    client.start({ publicApiKey: 'pk_test' });
    client.start({ publicApiKey: 'pk_test' });
    const posted = (
      fetchMock.mock.calls as unknown as [string, { body: string }][]
    )
      .flatMap(([, init]) => init.body.split('\n'))
      .map(
        (m) =>
          (JSON.parse(m) as { type: number; data: { tag?: string } }).data
            .tag ?? (JSON.parse(m) as { type: number }).type,
      );
    // the first start's meta and snapshot, nothing from the second yet
    expect(posted).toEqual(['recording-meta', EventType.FullSnapshot]);
  });
});
