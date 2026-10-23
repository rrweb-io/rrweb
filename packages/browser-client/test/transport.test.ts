import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EventBuffer,
  UploadTransport,
  MAX_BUFFER_BYTES,
  byteLength,
} from '../src/transport';

let transports: UploadTransport[];
beforeEach(() => {
  vi.useFakeTimers();
  transports = [];
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(async () => {
  transports.forEach((transport) => transport.dispose());
  await vi.advanceTimersByTimeAsync(15000);
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function setup() {
  const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>(
    async () => new Response(null, { status: 202 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const buffer = new EventBuffer();
  const transport = new UploadTransport(
    'https://example.test/events',
    'synthetic',
    buffer,
  );
  transports.push(transport);
  return { fetchMock, buffer, transport };
}
function deferred() {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Response>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('bounded HTTP transport', () => {
  it('restores a rejected batch before new arrivals and never resends accepted batches', async () => {
    const { fetchMock, buffer, transport } = setup();
    const pending = deferred();
    buffer.add('a'.repeat(40000));
    buffer.add('b'.repeat(40000));
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockReturnValueOnce(pending.promise);
    const flush = transport.flush();
    await vi.advanceTimersByTimeAsync(0);
    buffer.add('c');
    pending.reject(new TypeError('offline'));
    await flush;
    expect(buffer.peek()).toBe('b'.repeat(40000));
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock.mock.calls.map(([, init]) => init?.body)).toEqual([
      'a'.repeat(40000),
      'b'.repeat(40000),
      'b'.repeat(40000) + '\nc',
    ]);
  });

  it.each([400, 401, 403, 404, 413, 422])(
    'stops on terminal HTTP %s, without parsing its body',
    async (status) => {
      const { fetchMock, buffer, transport } = setup();
      fetchMock.mockResolvedValue(new Response('not json', { status }));
      buffer.add('a');
      await transport.flush();
      buffer.add('later');
      await vi.advanceTimersByTimeAsync(120000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(buffer.failed).toBe(true);
      expect(buffer.length()).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([408, 429, 500, 502, 503])(
    'bounds transient HTTP %s with 5/10/20-second backoff',
    async (status) => {
      const { fetchMock, buffer, transport } = setup();
      fetchMock.mockResolvedValue(new Response(null, { status }));
      buffer.add('a');
      await transport.flush();
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(20000);
      expect(fetchMock).toHaveBeenCalledTimes(4);
      buffer.add('later');
      await vi.advanceTimersByTimeAsync(120000);
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(buffer.failed).toBe(true);
    },
  );

  it('honors Retry-After without retaining data for arbitrarily long delays', async () => {
    const { fetchMock, buffer, transport } = setup();
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 429, headers: { 'Retry-After': '20' } }),
    );
    buffer.add('a');
    await transport.flush();
    await vi.advanceTimersByTimeAsync(15000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockResolvedValue(
      new Response(null, { status: 503, headers: { 'Retry-After': '120' } }),
    );
    buffer.add('b');
    await transport.flush();
    await vi.advanceTimersByTimeAsync(120000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(buffer.failed).toBe(true);
  });

  it('bounds tiny-event queue overhead', () => {
    const { buffer } = setup();
    for (let i = 0; i <= 10000; i++) buffer.add('');
    expect(buffer.failed).toBe(true);
    expect(buffer.length()).toBe(0);
  });

  it('times out stalled fetches and cancels the request', async () => {
    const { fetchMock, buffer, transport } = setup();
    fetchMock.mockImplementation(() => new Promise(() => {}));
    buffer.add('a');
    const done = transport.flush();
    await vi.advanceTimersByTimeAsync(15000);
    await done;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(buffer.peek()).toBe('a');
    transport.dispose();
    await vi.advanceTimersByTimeAsync(120000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serializes all flush calls and later recording transports', async () => {
    const { fetchMock, buffer, transport } = setup();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    buffer.add('old');
    const first = transport.flush();
    await vi.advanceTimersByTimeAsync(0);
    buffer.add('close');
    transport.dispose();
    const nextBuffer = new EventBuffer();
    const next = new UploadTransport(
      'https://example.test/new',
      'synthetic',
      nextBuffer,
    );
    transports.push(next);
    nextBuffer.add('new');
    const second = next.flush();
    await next.flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(next.canSend).toBe(false);
    pending.resolve(new Response(null, { status: 202 }));
    await Promise.all([first, second]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock.mock.calls.map(([, init]) => init?.body)).toEqual([
      'old',
      'close',
      'new',
    ]);
  });

  it('drops stopped generations while another request is pending', async () => {
    const { fetchMock, buffer, transport } = setup();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    buffer.add('active');
    const first = transport.flush();
    for (let i = 0; i < 100; i++) {
      const waitingBuffer = new EventBuffer();
      const waiting = new UploadTransport(
        'https://example.test/events',
        'synthetic',
        waitingBuffer,
      );
      waitingBuffer.add('x'.repeat(100000));
      await waiting.flush();
      waiting.dispose();
      expect(waitingBuffer.length()).toBe(0);
      expect(waitingBuffer.bytes).toBe(0);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    pending.resolve(new Response(null, { status: 202 }));
    await first;
  });

  it('does not restore a disposed failed request into the next recording', async () => {
    const { fetchMock, buffer, transport } = setup();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    buffer.add('old');
    const first = transport.flush();
    await vi.advanceTimersByTimeAsync(0);
    transport.dispose();
    pending.reject(new TypeError('offline'));
    await first;
    expect(buffer.length()).toBe(0);
    expect(buffer.failed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the retry budget while suspended and resumes without overlapping', async () => {
    const { fetchMock, buffer, transport } = setup();
    fetchMock.mockRejectedValue(new TypeError('offline'));
    buffer.add('a');
    await transport.flush();
    transport.suspend();
    await vi.advanceTimersByTimeAsync(120000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(buffer.peek()).toBe('a');
    transport.resume();
    await vi.advanceTimersByTimeAsync(120000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    transport.suspend();
    transport.resume();
    buffer.add('later');
    await vi.advanceTimersByTimeAsync(120000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('uses UTF-8 and newline bytes to keep batches within 64 KB', async () => {
    const { fetchMock, buffer, transport } = setup();
    buffer.add('é'.repeat(16000));
    buffer.add('é'.repeat(16000));
    await transport.flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(byteLength(String(init?.body))).toBeLessThanOrEqual(64000);
      expect(init?.keepalive).toBe(true);
    }
  });

  it('sends a bounded oversized event without keepalive through the same owner', async () => {
    const { fetchMock, buffer, transport } = setup();
    buffer.add('x'.repeat(1000001));
    await transport.flush();
    expect(fetchMock.mock.calls[0][1]?.keepalive).toBe(false);
    expect(buffer.bytes).toBe(0);
  });

  it('counts in-flight bytes and disables further retention on overflow', async () => {
    const { fetchMock, buffer, transport } = setup();
    const pending = deferred();
    fetchMock.mockReturnValueOnce(pending.promise);
    buffer.add('x'.repeat(MAX_BUFFER_BYTES - 1));
    const flush = transport.flush();
    await vi.advanceTimersByTimeAsync(0);
    buffer.add('one byte too many');
    expect(buffer.failed).toBe(true);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    pending.reject(new TypeError('aborted'));
    await flush;
    buffer.add('later');
    expect(buffer.bytes + buffer.reservedBytes).toBe(0);
    expect(buffer.length()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects a single event above the retained-byte cap before fetching', async () => {
    const { fetchMock, buffer, transport } = setup();
    buffer.add('x'.repeat(MAX_BUFFER_BYTES));
    await transport.flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(buffer.failed).toBe(true);
  });
});
