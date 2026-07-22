import type { eventWithTime } from '@rrweb/types';
import type { CloudSettings, Session } from '~/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildUploadUrl,
  type UploadDependencies,
  uploadSessions,
} from '../src/utils/cloud-upload';

const settings: CloudSettings = {
  apiBaseUrl: ' https://cloud.example.com/api/// ',
  authToken: ' token ',
};

const session = (id: string, name = `Session ${id}`): Session => ({
  id,
  name,
  tags: [],
  createTimestamp: 0,
  modifyTimestamp: 0,
  recorderVersion: '2.0.0',
});

const event = (timestamp: number): eventWithTime =>
  ({ type: 2, timestamp, data: {} } as eventWithTime);

const response = (status = 200, statusText = 'OK') =>
  ({ ok: status >= 200 && status < 300, status, statusText } as Response);

function dependencies(
  overrides: Partial<UploadDependencies> = {},
): UploadDependencies {
  return {
    getSession: vi.fn(async (id: string) => session(id)),
    getEvents: vi.fn(async () => [event(1), event(2)]),
    fetchFn: vi.fn(async () => response()),
    compress: vi.fn(async () => new ArrayBuffer(1)),
    compressionStreamCtor:
      CompressionStream as unknown as UploadDependencies['compressionStreamCtor'],
    ...overrides,
  };
}

describe('cloud upload', () => {
  it('builds a normalized endpoint with encoded session IDs', () => {
    expect(buildUploadUrl('https://cloud.example.com/', 'a/b')).toBe(
      'https://cloud.example.com/recordings/a%2Fb/ingest',
    );
    expect(buildUploadUrl(' https://cloud.example.com/api/// ', 'a/b')).toBe(
      'https://cloud.example.com/api/recordings/a%2Fb/ingest',
    );
  });

  it('short-circuits all IDs before storage or fetch when the token is missing', async () => {
    const deps = dependencies();

    await expect(
      uploadSessions(['one', 'two'], { ...settings, authToken: '  ' }, deps),
    ).resolves.toEqual([
      {
        id: 'one',
        name: 'one',
        ok: false,
        error: 'Missing authentication token',
      },
      {
        id: 'two',
        name: 'two',
        ok: false,
        error: 'Missing authentication token',
      },
    ]);
    expect(deps.getSession).not.toHaveBeenCalled();
    expect(deps.getEvents).not.toHaveBeenCalled();
    expect(deps.fetchFn).not.toHaveBeenCalled();
  });

  it('uploads Brotli-compressed NDJSON with the authenticated endpoint', async () => {
    const compressed = new Uint8Array([1, 2, 3]).buffer;
    const deps = dependencies({
      compress: vi.fn(async () => compressed),
    });

    await expect(uploadSessions(['a/b'], settings, deps)).resolves.toEqual([
      { id: 'a/b', name: 'Session a/b', ok: true },
    ]);
    expect(deps.compress).toHaveBeenCalledWith(
      `${JSON.stringify(event(1))}\n${JSON.stringify(event(2))}`,
      'brotli',
    );
    expect(deps.fetchFn).toHaveBeenCalledWith(
      'https://cloud.example.com/api/recordings/a%2Fb/ingest',
      expect.objectContaining({
        method: 'POST',
        body: compressed,
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/x-ndjson',
          'Content-Encoding': 'br',
        },
      }),
    );
  });

  it('uses the default CompressionStream compressor with the Brotli format', async () => {
    const compressionStreamCtor = vi.fn(function () {
      return new TransformStream<Uint8Array, Uint8Array>();
    });
    const fetchFn = vi.fn(async () => response());
    const deps = {
      getSession: vi.fn(async (id: string) => session(id)),
      getEvents: vi.fn(async () => [event(1)]),
      fetchFn,
      compressionStreamCtor,
    };

    await uploadSessions(['one'], settings, deps);

    expect(compressionStreamCtor).toHaveBeenCalledWith('brotli');
    expect(fetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Encoding': 'br' }),
      }),
    );
  });

  it('falls back from Brotli to gzip', async () => {
    const gzip = new Uint8Array([4, 5]).buffer;
    const deps = dependencies({
      compress: vi
        .fn()
        .mockRejectedValueOnce(new Error('Brotli unsupported'))
        .mockResolvedValueOnce(gzip),
    });

    await uploadSessions(['one'], settings, deps);

    expect(deps.compress).toHaveBeenNthCalledWith(
      1,
      `${JSON.stringify(event(1))}\n${JSON.stringify(event(2))}`,
      'brotli',
    );
    expect(deps.compress).toHaveBeenNthCalledWith(
      2,
      `${JSON.stringify(event(1))}\n${JSON.stringify(event(2))}`,
      'gzip',
    );
    expect(deps.fetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: gzip,
        headers: expect.objectContaining({ 'Content-Encoding': 'gzip' }),
      }),
    );
  });

  it('uploads raw NDJSON without a content encoding when compression is unavailable', async () => {
    const deps = dependencies({
      compress: vi.fn().mockRejectedValue(new Error('unsupported')),
    });
    const ndjson = `${JSON.stringify(event(1))}\n${JSON.stringify(event(2))}`;

    await uploadSessions(['one'], settings, deps);

    expect(deps.fetchFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: ndjson,
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/x-ndjson',
        },
      }),
    );
  });

  it('returns a concise HTTP failure without reading the response body', async () => {
    const deps = dependencies({
      fetchFn: vi.fn(async () => response(401, 'Unauthorized')),
    });

    await expect(uploadSessions(['one'], settings, deps)).resolves.toEqual([
      {
        id: 'one',
        name: 'Session one',
        ok: false,
        error: 'Upload failed: 401 Unauthorized',
      },
    ]);
  });

  it('continues after one session fails and uploads the next', async () => {
    const deps = dependencies({
      getSession: vi.fn(async (id: string) =>
        id === 'broken' ? undefined : session(id),
      ),
    });

    await expect(
      uploadSessions(['broken', 'valid'], settings, deps),
    ).resolves.toEqual([
      { id: 'broken', name: 'broken', ok: false, error: 'Session not found' },
      { id: 'valid', name: 'Session valid', ok: true },
    ]);
    expect(deps.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('reports missing sessions and invalid event data independently', async () => {
    const deps = dependencies({
      getSession: vi.fn(async (id: string) =>
        id === 'missing' ? undefined : session(id),
      ),
      getEvents: vi.fn(async (id: string) => (id === 'invalid' ? {} : [])),
    });

    await expect(
      uploadSessions(['missing', 'invalid'], settings, deps),
    ).resolves.toEqual([
      { id: 'missing', name: 'missing', ok: false, error: 'Session not found' },
      {
        id: 'invalid',
        name: 'Session invalid',
        ok: false,
        error: 'Session events are invalid',
      },
    ]);
    expect(deps.fetchFn).not.toHaveBeenCalled();
  });

  it('reports unavailable events with a stable message and continues uploading', async () => {
    const deps = dependencies({
      getEvents: vi.fn(async (id: string) => {
        if (id === 'missing-events') {
          throw new TypeError(
            "Cannot read properties of undefined (reading 'events')",
          );
        }

        return [event(1)];
      }),
    });

    await expect(
      uploadSessions(['missing-events', 'valid'], settings, deps),
    ).resolves.toEqual([
      {
        id: 'missing-events',
        name: 'Session missing-events',
        ok: false,
        error: 'Session events could not be loaded',
      },
      { id: 'valid', name: 'Session valid', ok: true },
    ]);
    expect(deps.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('converts fetch rejections into a per-session failure', async () => {
    const deps = dependencies({
      fetchFn: vi.fn(async () => {
        throw new Error('Network unavailable');
      }),
    });

    await expect(uploadSessions(['one'], settings, deps)).resolves.toEqual([
      {
        id: 'one',
        name: 'Session one',
        ok: false,
        error: 'Network unavailable',
      },
    ]);
  });

  it('does not log while uploading', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await uploadSessions(['one'], settings, dependencies());

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
