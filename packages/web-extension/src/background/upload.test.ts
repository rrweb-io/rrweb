import { describe, expect, it, vi } from 'vitest';
import { chunkLines, MAX_CHUNK_BYTES, uploadEvents } from './upload';

const target = {
  apiUrl: 'https://api.rrweb.com',
  recordingId: 'rec-1',
  publicKey: 'pk_acme',
};

const ok = () => new Response(null, { status: 202 });

describe('chunkLines', () => {
  it('keeps every line, in order, with each chunk within the limit', () => {
    const lines = ['aaaa', 'bbbb', 'cccc', 'dd'];
    // "aaaa\nbbbb" is 9 bytes; adding "\ncccc" would make 14
    expect(chunkLines(lines, 10)).toEqual([
      ['aaaa', 'bbbb'],
      ['cccc', 'dd'],
    ]);
  });

  it('counts UTF-8 bytes, so multi-byte text splits sooner', () => {
    // "é" is 2 bytes: "éé" and "éé" joined is 9 bytes, over 8
    expect(chunkLines(['éé', 'éé'], 8)).toEqual([['éé'], ['éé']]);
    expect(chunkLines(['éé', 'éé'], 9)).toEqual([['éé', 'éé']]);
  });

  it('sends a line over the limit in a chunk of its own', () => {
    expect(chunkLines(['a', 'x'.repeat(20), 'b'], 10)).toEqual([
      ['a'],
      ['x'.repeat(20)],
      ['b'],
    ]);
  });
});

describe('uploadEvents', () => {
  it('POSTs newline-joined events with the public key, in order', async () => {
    const fetchFn = vi.fn(async (_url: unknown, _init?: RequestInit) => ok());
    const big = 'x'.repeat(MAX_CHUNK_BYTES - 10);
    const result = await uploadEvents(
      target,
      ['{"a":1}', big, '{"c":3}'],
      fetchFn,
    );
    expect(result).toEqual({ state: 'delivered' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.rrweb.com/recordings/rec-1/events');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
        Authorization: 'Bearer pk_acme',
      },
      body: `{"a":1}\n${big}`,
    });
    expect(fetchFn.mock.calls[1][1]?.body).toBe('{"c":3}');
  });

  it('sends at most 1 MiB in one POST', async () => {
    const fetchFn = vi.fn((_url: unknown, _init?: RequestInit) =>
      Promise.resolve(ok()),
    );
    // Joined with the newline, exactly 1 MiB.
    const fits = ['x'.repeat(1_048_574), 'y'];
    await uploadEvents(target, fits, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(
      new TextEncoder().encode(String(fetchFn.mock.calls[0][1]?.body)),
    ).toHaveLength(1_048_576);

    // One byte more goes in two POSTs, in order.
    fetchFn.mockClear();
    await uploadEvents(target, ['x'.repeat(1_048_574), 'yy'], fetchFn);
    expect(fetchFn.mock.calls.map(([, init]) => init?.body)).toEqual([
      'x'.repeat(1_048_574),
      'yy',
    ]);
  });

  it('stops at a refused POST and returns its lines and every later one', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(
        new Response('quota', { status: 429, statusText: 'Too Many' }),
      );
    const half = 'y'.repeat(MAX_CHUNK_BYTES / 2 + 1);
    const lines = [half, half, half];
    const result = await uploadEvents(target, lines, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      state: 'not-delivered',
      unsent: [half, half],
    });
    if (result.state === 'not-delivered')
      expect(result.error.message).toBe(
        'rrweb refused the upload (429 Too Many): quota',
      );
  });

  it('saves what is still unsent after each accepted POST but the last', async () => {
    const half = 'y'.repeat(MAX_CHUNK_BYTES / 2 + 1);
    const lines = ['a' + half, 'b' + half, 'c' + half];
    const saved: string[][] = [];
    const fetchFn = vi.fn().mockResolvedValue(ok());
    const result = await uploadEvents(
      target,
      lines,
      fetchFn,
      async (unsent) => {
        saved.push(unsent);
      },
    );
    expect(result).toEqual({ state: 'delivered' });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(saved).toEqual([['b' + half, 'c' + half], ['c' + half]]);
  });

  it('keeps uploading when saving the progress fails', async () => {
    const half = 'y'.repeat(MAX_CHUNK_BYTES / 2 + 1);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = vi.fn().mockResolvedValue(ok());
    await expect(
      uploadEvents(target, [half, half], fetchFn, () =>
        Promise.reject(new Error('quota')),
      ),
    ).resolves.toEqual({ state: 'delivered' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    logged.mockRestore();
  });

  it('keeps every line when the server cannot be reached', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await uploadEvents(target, ['a', 'b'], fetchFn);
    expect(result).toMatchObject({
      state: 'not-delivered',
      unsent: ['a', 'b'],
    });
    if (result.state === 'not-delivered')
      expect(result.error.message).toBe(
        'Could not reach rrweb: Failed to fetch',
      );
  });
});
