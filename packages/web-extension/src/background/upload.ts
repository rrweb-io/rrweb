/** The most a single POST body may hold, in UTF-8 bytes. */
export const MAX_CHUNK_BYTES = 1024 * 1024;

/**
 * delivered: the server accepted every line.
 * not-delivered: a POST failed; `unsent` holds that POST's lines and every
 * later one, in order, to send again to the same recording.
 */
export type UploadResult =
  | { state: 'delivered' }
  | { state: 'not-delivered'; error: Error; unsent: string[] };

export type UploadTarget = {
  apiUrl: string;
  recordingId: string;
  publicKey: string;
};

/**
 * Split serialized events into POST bodies of at most `MAX_CHUNK_BYTES`,
 * newline-joined, keeping their order. A single line over the limit goes in
 * a chunk of its own.
 */
export function chunkLines(lines: string[], maxBytes = MAX_CHUNK_BYTES) {
  const encoder = new TextEncoder();
  const chunks: string[][] = [];
  let chunk: string[] = [];
  let size = 0;
  for (const line of lines) {
    const lineSize = encoder.encode(line).length;
    // Each line after the first adds a newline byte.
    if (chunk.length > 0 && size + 1 + lineSize > maxBytes) {
      chunks.push(chunk);
      chunk = [];
      size = 0;
    }
    size += chunk.length === 0 ? lineSize : lineSize + 1;
    chunk.push(line);
  }
  if (chunk.length > 0) chunks.push(chunk);
  return chunks;
}

/**
 * POST serialized events to the public ingest API, one chunk at a time and in
 * order. The first failure stops the upload, so the server never receives
 * events out of order. After each accepted chunk but the last, `onDelivered`
 * gets what is still unsent, so an upload cut short (the worker stopped, the
 * browser closed) resumes there instead of sending accepted events again.
 * Never rejects.
 */
export async function uploadEvents(
  target: UploadTarget,
  lines: string[],
  fetchFn: typeof fetch = fetch,
  onDelivered?: (unsent: string[]) => Promise<void>,
): Promise<UploadResult> {
  const url = `${target.apiUrl}/recordings/${encodeURIComponent(
    target.recordingId,
  )}/events`;
  const chunks = chunkLines(lines);
  for (let i = 0; i < chunks.length; i++) {
    const failure = await postChunk(url, target.publicKey, chunks[i], fetchFn);
    if (failure)
      return {
        state: 'not-delivered',
        error: failure,
        unsent: chunks.slice(i).flat(),
      };
    if (onDelivered && i < chunks.length - 1)
      // A failed checkpoint only risks sending these events twice later.
      await onDelivered(chunks.slice(i + 1).flat()).catch((error) =>
        console.error('Could not save the upload progress:', error),
      );
  }
  return { state: 'delivered' };
}

/** Why the POST failed, or undefined once the server accepted it. */
async function postChunk(
  url: string,
  publicKey: string,
  lines: string[],
  fetchFn: typeof fetch,
): Promise<Error | undefined> {
  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
        Authorization: `Bearer ${publicKey}`,
      },
      body: lines.join('\n'),
    });
  } catch (error) {
    return new Error(
      `Could not reach rrweb: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (response.ok) return undefined;
  const body = await response.text().catch(() => '');
  return new Error(
    `rrweb refused the upload (${response.status}${
      response.statusText ? ` ${response.statusText}` : ''
    })${body ? `: ${body.slice(0, 200)}` : ''}`,
  );
}
