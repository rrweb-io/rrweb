import { EventType } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransport, postEvents } from '../src/transport';

class FakeWebSocket extends EventTarget {
  static instances: FakeWebSocket[] = [];
  static autoOpen = true;
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  // websocket-ts compares readyState against the instance constants
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  readyState = 0;
  binaryType = 'blob';
  sent: string[] = [];
  constructor(public url: string) {
    super();
    FakeWebSocket.instances.push(this);
    if (!FakeWebSocket.autoOpen) return; // stays connecting
    setTimeout(() => {
      this.readyState = 1;
      this.dispatchEvent(new Event('open'));
    }, 0);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event('close'));
  }
  /** The connection drops without the client asking (network or server). */
  drop() {
    this.close();
  }
  receive(data: unknown) {
    this.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify(data) }),
    );
  }
}

const meta = { domain: 'example.com', jsEntrypoint: 'chrome-extension' };
const options = {
  publicApiKey: 'pk_test',
  recordingId: 'rec-123',
  meta,
};

const fullSnapshot = (timestamp: number): eventWithTime =>
  ({
    type: EventType.FullSnapshot,
    data: {},
    timestamp,
  } as unknown as eventWithTime);

const opened = () => new Promise((resolve) => setTimeout(resolve, 5));
const messages = () =>
  FakeWebSocket.instances[0].sent.map(
    (s) => JSON.parse(s) as { type: number; data: { tag?: string } },
  );

describe('createTransport', () => {
  const realWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    FakeWebSocket.autoOpen = true;
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.WebSocket = realWebSocket;
    vi.unstubAllGlobals();
  });

  it('sends recording-meta first with the supplied meta', async () => {
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    await opened();
    expect(messages()[0]).toEqual({
      type: EventType.Custom,
      timestamp: expect.any(Number),
      data: {
        tag: 'recording-meta',
        payload: {
          domain: 'example.com',
          jsEntrypoint: 'chrome-extension',
          recordVersion: expect.any(String),
          recordCommitHash: expect.any(String),
        },
      },
    });
  });

  it('uses the supplied recordingId in the socket URL', () => {
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    const url = new URL(FakeWebSocket.instances[0].url);
    expect(url.pathname).toBe('/recordings/rec-123/events/ws');
    expect(url.searchParams.get('token')).toBe('pk_test');
  });

  it('sends events in order after meta', async () => {
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    transport.send(fullSnapshot(2));
    await opened();
    transport.send(fullSnapshot(3));
    expect(messages().map((m) => m.data.tag ?? m.type)).toEqual([
      'recording-meta',
      EventType.FullSnapshot,
      EventType.FullSnapshot,
      EventType.FullSnapshot,
    ]);
    expect(
      messages()
        .slice(1)
        .map((m) => (m as unknown as { timestamp: number }).timestamp),
    ).toEqual([1, 2, 3]);
  });

  it('stop(true) sends close-permanent', async () => {
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    await opened();
    transport.stop(true);
    expect(messages().at(-1)?.data.tag).toBe('close-permanent');
  });

  it('stop(false) sends close-temporary', async () => {
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    await opened();
    transport.stop(false);
    expect(messages().at(-1)?.data.tag).toBe('close-temporary');
  });

  it('stop(true) delivers events buffered while the socket is still connecting', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    transport.send(fullSnapshot(2));
    // socket has not opened yet, so everything is buffered
    await transport.stop(true);
    const posted = (
      fetchMock.mock.calls as unknown as [string, { body: string }][]
    ).flatMap(([, init]) => init.body.split('\n'));
    const parsed = posted.map(
      (m) => JSON.parse(m) as { timestamp: number; data: { tag?: string } },
    );
    expect(parsed.map((m) => m.data.tag ?? m.timestamp)).toEqual([
      'recording-meta',
      1,
      2,
      'close-permanent',
    ]);
    await opened();
    expect(FakeWebSocket.instances[0].sent).toEqual([]);
  });

  it('stop(false) POSTs only close-temporary when the socket is still connecting', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    await transport.stop(false);
    // meta and the snapshot are dropped, as before; the close event is not
    const bodies = (
      fetchMock.mock.calls as unknown as [string, { body: string }][]
    ).flatMap(([, init]) => init.body.split('\n'));
    expect(
      bodies.map((m) => (JSON.parse(m) as { data: { tag: string } }).data.tag),
    ).toEqual(['close-temporary']);
    await opened();
    expect(FakeWebSocket.instances[0].sent).toEqual([]);
  });

  it('stop(true) after disconnect() still delivers what was buffered while connecting', async () => {
    FakeWebSocket.autoOpen = false; // the socket stays connecting
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    transport.send(fullSnapshot(2));
    transport.disconnect();
    await transport.stop(true);
    const posted = (
      fetchMock.mock.calls as unknown as [string, { body: string }][]
    ).flatMap(([, init]) => init.body.split('\n'));
    const parsed = posted.map(
      (m) => JSON.parse(m) as { timestamp: number; data: { tag?: string } },
    );
    expect(parsed.map((m) => m.data.tag ?? m.timestamp)).toEqual([
      'recording-meta',
      1,
      2,
      'close-permanent',
    ]);
  });

  it('stop(true) POSTs nothing when no event was ever sent', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = createTransport(options);
    await transport.stop(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(FakeWebSocket.instances).toEqual([]);
  });

  it('keeps each transport buffer and socket separate', async () => {
    const a = createTransport(options);
    const b = createTransport({ ...options, recordingId: 'rec-456' });
    a.send(fullSnapshot(1));
    b.send(fullSnapshot(2));
    await opened();
    const [socketA, socketB] = FakeWebSocket.instances;
    expect(socketA.url).toContain('rec-123');
    expect(socketB.url).toContain('rec-456');
    expect(socketA.sent).toHaveLength(2);
    expect(socketB.sent).toHaveLength(2);
  });

  it('runs without document or sessionStorage', () => {
    const globals = globalThis as Record<string, unknown>;
    const saved = {
      document: globals.document,
      sessionStorage: globals.sessionStorage,
    };
    delete globals.document;
    delete globals.sessionStorage;
    try {
      expect(() => {
        const transport = createTransport(options);
        transport.send(fullSnapshot(1));
      }).not.toThrow();
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value !== undefined) globals[key] = value;
      }
    }
  });
  it('stop() closes the socket where the runtime defines no global WebSocket', async () => {
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    await opened();
    // happy-dom, older Node and some workers have no WebSocket global; the
    // socket was built already, so only stop() would look it up.
    globalThis.WebSocket = undefined as unknown as typeof WebSocket;
    await expect(transport.stop(true)).resolves.toEqual({ delivered: true });
    expect(messages().at(-1)?.data.tag).toBe('close-permanent');
    expect(fetch).not.toHaveBeenCalled();
  });

  const postedLines = (fetchMock: ReturnType<typeof vi.fn>) =>
    (fetchMock.mock.calls as unknown as [string, { body: string }][]).flatMap(
      ([, init]) => init.body.split('\n'),
    );
  const tagOrTimestamp = (line: string) => {
    const m = JSON.parse(line) as { timestamp: number; data: { tag?: string } };
    return m.data.tag ?? m.timestamp;
  };

  it('stop(true) reports a rejected final POST and returns every unsent event in order', async () => {
    FakeWebSocket.autoOpen = false; // nothing goes over the socket
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Unavailable',
        bodyUsed: false,
        json: () => Promise.resolve({ error: 'down' }),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    transport.send(fullSnapshot(2));
    const result = await transport.stop(true);
    expect(result.delivered).toBe(false);
    if (result.delivered) return;
    expect(result.error.message).toContain('503');
    expect(result.unsent.map(tagOrTimestamp)).toEqual([
      'recording-meta',
      1,
      2,
      'close-permanent',
    ]);
  });

  it('stop(true) keeps the events when the final POST cannot reach the server', async () => {
    FakeWebSocket.autoOpen = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    const result = await transport.stop(true);
    expect(result.delivered).toBe(false);
    if (result.delivered) return;
    expect(result.error.message).toBe('Failed to fetch');
    expect(result.unsent.map(tagOrTimestamp)).toEqual([
      'recording-meta',
      1,
      'close-permanent',
    ]);
  });

  it('stop(true) resolves delivered once the final POST succeeds', async () => {
    FakeWebSocket.autoOpen = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, status: 200 })),
    );
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    await expect(transport.stop(true)).resolves.toEqual({ delivered: true });
  });

  it('stop(true) still delivers a large event whose own POST failed', async () => {
    FakeWebSocket.autoOpen = false;
    let calls = 0;
    const fetchMock = vi.fn(() =>
      ++calls === 1
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve({ ok: true, status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const transport = createTransport(options);
    const large = {
      ...fullSnapshot(7),
      data: { blob: 'x'.repeat(10e5 + 1) },
    } as unknown as eventWithTime;
    transport.send(large); // too big for the socket: POSTed on its own, fails
    await Promise.resolve();
    await expect(transport.stop(true)).resolves.toEqual({ delivered: true });
    expect(postedLines(fetchMock).slice(1).map(tagOrTimestamp)).toEqual([
      'recording-meta',
      7,
      'close-permanent',
    ]);
  });

  describe('a large event whose own POST failed', () => {
    const largeEvent = (timestamp: number) =>
      ({
        ...fullSnapshot(timestamp),
        data: { blob: 'x'.repeat(10e5 + 1) },
      } as unknown as eventWithTime);
    const firstPostFails = () => {
      let calls = 0;
      const fetchMock = vi.fn(() =>
        ++calls === 1
          ? Promise.reject(new TypeError('Failed to fetch'))
          : Promise.resolve({ ok: true, status: 200 }),
      );
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    };

    it('is never sent over the socket that opens afterwards, and stop(true) POSTs it before close-permanent', async () => {
      const fetchMock = firstPostFails();
      const transport = createTransport(options);
      transport.send(largeEvent(7)); // POSTed on its own; that POST fails
      await opened(); // the socket opens and drains its buffer
      const socketSent = FakeWebSocket.instances[0].sent;
      expect(socketSent.map(tagOrTimestamp)).toEqual(['recording-meta']);
      expect(socketSent.every((m) => m.length < 10e5)).toBe(true);
      await expect(transport.stop(true)).resolves.toEqual({ delivered: true });
      // the failed POST, then one final POST: the large event, then close
      expect(postedLines(fetchMock).slice(1).map(tagOrTimestamp)).toEqual([
        7,
        'close-permanent',
      ]);
      expect(FakeWebSocket.instances[0].sent).toEqual(socketSent);
    });

    it('is POSTed again by flush() even while the socket is streaming', async () => {
      const fetchMock = firstPostFails();
      const transport = createTransport(options);
      transport.send(largeEvent(7));
      await opened();
      transport.flush();
      await Promise.resolve();
      expect(postedLines(fetchMock).slice(1).map(tagOrTimestamp)).toEqual([7]);
      expect(FakeWebSocket.instances[0].sent.map(tagOrTimestamp)).not.toContain(
        7,
      );
    });

    it('is reported unsent ahead of close-permanent when the final POST fails too', async () => {
      FakeWebSocket.autoOpen = false;
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
      );
      const transport = createTransport(options);
      transport.send(largeEvent(7));
      transport.send(fullSnapshot(8));
      await Promise.resolve();
      const result = await transport.stop(true);
      if (result.delivered) throw new Error('expected a failed delivery');
      expect(result.unsent.map(tagOrTimestamp)).toEqual([
        'recording-meta',
        8,
        7,
        'close-permanent',
      ]);
    });
  });

  it('flush() POSTs what is buffered while the first socket is still connecting', () => {
    FakeWebSocket.autoOpen = false; // the socket stays connecting
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    transport.flush();
    expect(postedLines(fetchMock).map(tagOrTimestamp)).toEqual([
      'recording-meta',
      1,
    ]);
  });

  it('flush() POSTs nothing while the socket is open and streaming', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const transport = createTransport(options);
    transport.send(fullSnapshot(1));
    await opened();
    transport.flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(messages().map((m) => m.data.tag ?? m.type)).toEqual([
      'recording-meta',
      EventType.FullSnapshot,
    ]);
  });

  describe('postEvents', () => {
    it('POSTs the given lines in order to the recording events URL', async () => {
      const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      const lines = ['{"a":1}', '{"a":2}'];
      await expect(
        postEvents(
          {
            publicApiKey: 'pk_test',
            recordingId: 'rec-123',
            serverUrl: 'https://api.example/recordings/{recordingId}/events/ws',
          },
          lines,
        ),
      ).resolves.toEqual({ delivered: true });
      const [url, init] = (
        fetchMock.mock.calls as unknown as [
          string,
          { body: string; headers: Record<string, string> },
        ][]
      )[0];
      expect(url).toBe('https://api.example/recordings/rec-123/events');
      expect(init.headers.Authorization).toBe('Bearer pk_test');
      expect(init.body).toBe('{"a":1}\n{"a":2}');
    });

    it('returns the lines it could not deliver', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
      );
      const result = await postEvents(
        { publicApiKey: 'pk_test', recordingId: 'rec-123' },
        ['{"a":1}', '{"a":2}'],
      );
      expect(result).toEqual({
        delivered: false,
        error: new TypeError('Failed to fetch'),
        unsent: ['{"a":1}', '{"a":2}'],
      });
    });
  });

  describe('after the socket drops', () => {
    // ExponentialBackoff's first retry waits 1 to 3 s; the fallback POST runs every 5 s.
    const firstRetry = 3100;
    const timestamps = (sent: string[]) =>
      sent.map((m) => (JSON.parse(m) as { timestamp: number }).timestamp);
    const postedTimestamps = (fetchMock: ReturnType<typeof vi.fn>) =>
      (fetchMock.mock.calls as unknown as [string, { body: string }][])
        .flatMap(([, init]) => init.body.split('\n'))
        .map((m) => (JSON.parse(m) as { timestamp: number }).timestamp);

    beforeEach(() => {
      vi.useFakeTimers();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: true, status: 200 })),
      );
    });

    it('sends over the socket again once it reopens', async () => {
      const transport = createTransport(options);
      transport.send(fullSnapshot(1));
      await vi.advanceTimersByTimeAsync(5);
      FakeWebSocket.instances[0].drop();
      await vi.advanceTimersByTimeAsync(firstRetry);
      expect(FakeWebSocket.instances).toHaveLength(2);
      transport.send(fullSnapshot(2));
      expect(timestamps(FakeWebSocket.instances[1].sent)).toEqual([2]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('keeps buffering after a server error, even once the socket reopens', async () => {
      const transport = createTransport(options);
      transport.send(fullSnapshot(1));
      await vi.advanceTimersByTimeAsync(5);
      FakeWebSocket.instances[0].receive({ type: 'error' });
      transport.send(fullSnapshot(2));
      expect(timestamps(FakeWebSocket.instances[0].sent).slice(1)).toEqual([1]);
      transport.flush(); // POSTs the buffer and empties it
      FakeWebSocket.instances[0].drop();
      await vi.advanceTimersByTimeAsync(firstRetry);
      expect(FakeWebSocket.instances).toHaveLength(2);
      transport.send(fullSnapshot(3));
      expect(FakeWebSocket.instances[1].sent).toEqual([]);
      transport.flush();
      expect(postedTimestamps(fetch as ReturnType<typeof vi.fn>)).toEqual([
        2, 3,
      ]);
    });

    it('POSTs the buffer while the socket stays closed', async () => {
      const transport = createTransport(options);
      transport.send(fullSnapshot(1));
      await vi.advanceTimersByTimeAsync(5);
      FakeWebSocket.autoOpen = false; // every reconnect attempt hangs
      FakeWebSocket.instances[0].drop();
      transport.send(fullSnapshot(2));
      expect(fetch).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(5000);
      expect(postedTimestamps(fetch as ReturnType<typeof vi.fn>)).toEqual([2]);
      expect(timestamps(FakeWebSocket.instances[0].sent).slice(1)).toEqual([1]);
    });

    it('stop(true) POSTs close-permanent when the socket never opened and the fallback emptied the buffer', async () => {
      FakeWebSocket.autoOpen = false; // the socket stays connecting
      const transport = createTransport(options);
      transport.send(fullSnapshot(1));
      await vi.advanceTimersByTimeAsync(5000); // fallback POSTs meta and the snapshot
      await transport.stop(true);
      const tags = (
        (fetch as ReturnType<typeof vi.fn>).mock.calls as unknown as [
          string,
          { body: string },
        ][]
      )
        .flatMap(([, init]) => init.body.split('\n'))
        .map(
          (m) =>
            (JSON.parse(m) as { timestamp: number; data: { tag?: string } })
              .data.tag ?? 'event',
        );
      expect(tags).toEqual(['recording-meta', 'event', 'close-permanent']);
    });

    it('stop(true) posts close-permanent only after a POST already in flight settles', async () => {
      FakeWebSocket.autoOpen = false; // the socket stays connecting
      let release: (() => void) | undefined;
      const fetchMock = vi.fn(() =>
        fetchMock.mock.calls.length === 1
          ? new Promise((resolve) => {
              release = () => resolve({ ok: true, status: 200 });
            })
          : Promise.resolve({ ok: true, status: 200 }),
      );
      vi.stubGlobal('fetch', fetchMock);
      const transport = createTransport(options);
      transport.send(fullSnapshot(1));
      await vi.advanceTimersByTimeAsync(5000); // fallback POST of meta and the snapshot hangs
      let stopped = false;
      const stopping = transport.stop(true).then(() => {
        stopped = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      const tagsPerPost = () =>
        (fetchMock.mock.calls as unknown as [string, { body: string }][]).map(
          ([, init]) =>
            init.body
              .split('\n')
              .map(
                (m) =>
                  (JSON.parse(m) as { data: { tag?: string } }).data.tag ??
                  'event',
              ),
        );
      expect(tagsPerPost()).toEqual([['recording-meta', 'event']]);
      expect(stopped).toBe(false);
      release?.();
      await stopping;
      expect(tagsPerPost()).toEqual([
        ['recording-meta', 'event'],
        ['close-permanent'],
      ]);
    });
  });
});
