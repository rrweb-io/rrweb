import type { eventWithTime } from '@rrweb/types';
import type { CloudSettings, Session } from '~/types';
import { normalizeApiBaseUrl, normalizeCloudSettings } from './cloud-settings';
import { getEvents, getSession } from './storage';

export type SessionUploadResult = {
  id: string;
  name: string;
  ok: boolean;
  error?: string;
};

type CompressionEncoding = 'br' | 'gzip';

export type UploadDependencies = {
  getSession: (id: string) => Promise<Session | undefined>;
  getEvents: (id: string) => Promise<unknown>;
  fetchFn: typeof fetch;
  compress: (
    payload: string,
    encoding: CompressionEncoding,
  ) => Promise<ArrayBuffer>;
};

type CompressionStreamConstructor = new (format: CompressionEncoding) => {
  writable: WritableStream<BufferSource>;
  readable: ReadableStream<Uint8Array>;
};

async function compressWithCompressionStream(
  payload: string,
  encoding: CompressionEncoding,
): Promise<ArrayBuffer> {
  const CompressionStreamWithBrotli =
    CompressionStream as unknown as CompressionStreamConstructor;
  const stream = new Blob([payload])
    .stream()
    .pipeThrough(new CompressionStreamWithBrotli(encoding));

  return new Response(stream).arrayBuffer();
}

const defaultDependencies: UploadDependencies = {
  getSession,
  getEvents,
  fetchFn: fetch,
  compress: compressWithCompressionStream,
};

export function buildUploadUrl(baseUrl: string, sessionId: string): string {
  return `${normalizeApiBaseUrl(baseUrl)}/recordings/${encodeURIComponent(
    sessionId,
  )}/ingest`;
}

function failure(id: string, name: string, error: string): SessionUploadResult {
  return { id, name, ok: false, error };
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Upload failed';
}

async function compressPayload(
  payload: string,
  compress: UploadDependencies['compress'],
): Promise<{
  body: ArrayBuffer | string;
  contentEncoding?: CompressionEncoding;
}> {
  try {
    return { body: await compress(payload, 'br'), contentEncoding: 'br' };
  } catch {
    try {
      return { body: await compress(payload, 'gzip'), contentEncoding: 'gzip' };
    } catch {
      return { body: payload };
    }
  }
}

export async function uploadSessions(
  ids: string[],
  settings: CloudSettings,
  dependencies: Partial<UploadDependencies> = {},
): Promise<SessionUploadResult[]> {
  let normalizedSettings: CloudSettings;

  try {
    normalizedSettings = normalizeCloudSettings(settings);
  } catch (error) {
    return ids.map((id) => failure(id, id, errorMessage(error)));
  }

  if (!normalizedSettings.authToken) {
    return ids.map((id) => failure(id, id, 'Missing authentication token'));
  }

  const { getSession, getEvents, fetchFn, compress } = {
    ...defaultDependencies,
    ...dependencies,
  };
  const results: SessionUploadResult[] = [];

  for (const id of ids) {
    let session: Session | undefined;

    try {
      session = await getSession(id);
      if (!session) {
        results.push(failure(id, id, 'Session not found'));
        continue;
      }

      const events = await getEvents(id);
      if (!Array.isArray(events)) {
        results.push(
          failure(id, session.name || id, 'Session events are invalid'),
        );
        continue;
      }

      const payload = (events as eventWithTime[])
        .map((event) => JSON.stringify(event))
        .join('\n');
      const { body, contentEncoding } = await compressPayload(
        payload,
        compress,
      );
      const headers: Record<string, string> = {
        Authorization: `Bearer ${normalizedSettings.authToken}`,
        'Content-Type': 'application/x-ndjson',
      };

      if (contentEncoding) {
        headers['Content-Encoding'] = contentEncoding;
      }

      const response = await fetchFn(
        buildUploadUrl(normalizedSettings.apiBaseUrl, id),
        { method: 'POST', headers, body },
      );

      if (!response.ok) {
        results.push(
          failure(
            id,
            session.name || id,
            `Upload failed: ${response.status} ${response.statusText}`,
          ),
        );
        continue;
      }

      results.push({ id, name: session.name || id, ok: true });
    } catch (error) {
      results.push(failure(id, session?.name || id, errorMessage(error)));
    }
  }

  return results;
}
