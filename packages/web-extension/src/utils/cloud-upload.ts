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

export type CompressionFormat = 'brotli' | 'gzip';

type ContentEncoding = 'br' | 'gzip';

export type UploadDependencies = {
  getSession: (id: string) => Promise<Session | undefined>;
  getEvents: (id: string) => Promise<unknown>;
  fetchFn: typeof fetch;
  compress: (
    payload: string,
    format: CompressionFormat,
  ) => Promise<ArrayBuffer>;
  compressionStreamCtor: CompressionStreamConstructor;
};

export type CompressionStreamConstructor = new (format: CompressionFormat) => {
  writable: WritableStream<BufferSource>;
  readable: ReadableStream<Uint8Array>;
};

async function compressWithCompressionStream(
  payload: string,
  format: CompressionFormat,
  compressionStreamCtor: CompressionStreamConstructor,
): Promise<ArrayBuffer> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
      controller.close();
    },
  });
  const stream = source.pipeThrough(new compressionStreamCtor(format));

  return new Response(stream).arrayBuffer();
}

const defaultDependencies: Omit<
  UploadDependencies,
  'compress' | 'compressionStreamCtor'
> = {
  getSession,
  getEvents,
  fetchFn: fetch,
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
  contentEncoding?: ContentEncoding;
}> {
  try {
    return { body: await compress(payload, 'brotli'), contentEncoding: 'br' };
  } catch {
    try {
      return { body: await compress(payload, 'gzip'), contentEncoding: 'gzip' };
    } catch {
      return { body: payload };
    }
  }
}

/**
 * Configured API endpoints must allow extension-origin POST requests and the
 * Authorization, Content-Type, and Content-Encoding request headers via CORS.
 */
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

  const { getSession, getEvents, fetchFn } = {
    ...defaultDependencies,
    ...dependencies,
  };
  const compress =
    dependencies.compress ??
    ((payload: string, format: CompressionFormat) =>
      compressWithCompressionStream(
        payload,
        format,
        dependencies.compressionStreamCtor ??
          (CompressionStream as unknown as CompressionStreamConstructor),
      ));
  const results: SessionUploadResult[] = [];

  for (const id of ids) {
    let session: Session | undefined;

    try {
      session = await getSession(id);
      if (!session) {
        results.push(failure(id, id, 'Session not found'));
        continue;
      }

      let events: unknown;

      try {
        events = await getEvents(id);
      } catch {
        results.push(
          failure(id, session.name || id, 'Session events could not be loaded'),
        );
        continue;
      }

      if (!Array.isArray(events)) {
        results.push(
          failure(id, session.name || id, 'Session events are invalid'),
        );
        continue;
      }

      let payload = '';
      for (const event of events as eventWithTime[]) {
        if (payload) {
          payload += '\n';
        }
        payload += JSON.stringify(event);
      }
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
