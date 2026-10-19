import { ArrayQueue } from 'websocket-ts';

export const MAX_BUFFER_BYTES = 5 * 1024 * 1024;
const BATCH_BYTES = 64000;
const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT = 15000;

export const byteLength = (value: string): number =>
  // eslint-disable-next-line compat/compat -- The client requires modern browser transport APIs.
  new TextEncoder().encode(value).byteLength;

/** Includes the active POST batch in the budget. Fail closed rather than
 * silently dropping a snapshot and continuing with dependent mutations. */
export class EventBuffer extends ArrayQueue<string> {
  bytes = 0;
  reservedBytes = 0;
  failed = false;
  onFailure?: () => void;

  add(value: string): void {
    if (this.failed) return;
    if (value.length >= MAX_BUFFER_BYTES || this.length() >= 10000) {
      this.fail();
      return;
    }
    const size = byteLength(value) + 1;
    if (this.bytes + this.reservedBytes + size > MAX_BUFFER_BYTES) {
      this.fail();
      return;
    }
    this.bytes += size;
    super.add(value);
  }

  read(): string | undefined {
    const value = super.read();
    if (value !== undefined) this.bytes -= byteLength(value) + 1;
    return value;
  }

  clear(): void {
    super.clear();
    this.bytes = 0;
  }

  fail(): void {
    if (this.failed) return;
    this.failed = true;
    this.clear();
    console.warn(
      '@rrweb/browser-client: upload stopped; buffered events discarded',
    );
    this.onFailure?.();
  }
}

/** One HTTP owner per recording. Never rejects to fire-and-forget callers. */
let activeFlushes = 0;

export class UploadTransport {
  private posting = false;
  private disposed = false;
  private failures = 0;
  private nextAttempt = 0;
  private controller?: AbortController;
  private polling?: ReturnType<typeof setInterval>;

  constructor(
    private readonly url: string,
    private readonly token: string,
    readonly buffer: EventBuffer,
    onFailure?: () => void,
  ) {
    this.resume();
    buffer.onFailure = () => {
      clearInterval(this.polling);
      this.controller?.abort();
      onFailure?.();
    };
  }

  get canSend(): boolean {
    return (
      activeFlushes === 0 &&
      !this.disposed &&
      !this.posting &&
      !this.buffer.failed &&
      !this.buffer.length()
    );
  }

  drain(send: (event: string) => boolean): void {
    if (
      activeFlushes ||
      this.posting ||
      this.disposed ||
      this.buffer.failed ||
      this.failures
    )
      return;
    for (
      let event = this.buffer.peek();
      event !== undefined;
      event = this.buffer.peek()
    ) {
      try {
        if (!send(event)) return;
      } catch {
        return;
      }
      this.buffer.read();
    }
  }

  resume(): void {
    this.disposed = false;
    if (!this.polling && !this.buffer.failed)
      this.polling = setInterval(() => void this.flush(), 5000);
  }

  suspend(): void {
    clearInterval(this.polling);
    this.polling = undefined;
    void this.flush();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    clearInterval(this.polling);
    this.polling = undefined;
    // A current request may finish and drain the remaining queue. No retry
    // after disposal, and a failed batch never reaches the next recording.
    void this.flush();
  }

  async flush(): Promise<void> {
    if (this.posting || this.buffer.failed || !this.buffer.length()) return;
    if (Date.now() < this.nextAttempt) {
      if (this.disposed) this.buffer.fail();
      return;
    }
    if (activeFlushes) {
      // Do not retain a chain of stopped generations behind a slow request.
      // A live recording retries on its existing poll; a stopped one drops
      // its unsent final data rather than keeping another queue alive.
      if (this.disposed) this.buffer.clear();
      return;
    }
    this.posting = true;
    activeFlushes++;
    try {
      while (this.buffer.length() && !this.buffer.failed) {
        const batch: string[] = [];
        let size = 0;
        while (this.buffer.length()) {
          const next = this.buffer.peek();
          if (next === undefined) break;
          const nextSize = byteLength(next) + (batch.length ? 1 : 0);
          if (batch.length && size + nextSize > BATCH_BYTES) break;
          this.buffer.read();
          batch.push(next);
          size += nextSize;
          // A single large event is sent without keepalive, subject to the
          // same retained-byte budget, timeout and retry limits.
          if (size >= BATCH_BYTES) break;
        }
        this.buffer.reservedBytes = size + 1;
        // eslint-disable-next-line compat/compat -- Required to bound fetch lifetime in supported modern browsers.
        const controller = new AbortController();
        this.controller = controller;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let response: Response | undefined;
        try {
          response = await Promise.race([
            // eslint-disable-next-line compat/compat -- fetch is the browser transport.
            fetch(this.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-ndjson',
                Authorization: `Bearer ${this.token}`,
              },
              body: batch.join('\n'),
              keepalive: size <= BATCH_BYTES,
              signal: controller.signal,
            }),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(() => {
                controller.abort();
                reject(new Error('Upload timeout'));
              }, REQUEST_TIMEOUT);
            }),
          ]);
        } catch {
          // Fetch rejection/timeout has unknown acceptance, and is retryable.
        } finally {
          clearTimeout(timeout);
          this.controller = undefined;
          this.buffer.reservedBytes = 0;
        }
        if (this.buffer.failed) break;
        if (response?.ok) {
          this.failures = 0;
          this.nextAttempt = 0;
          continue;
        }
        const transient =
          !response ||
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500;
        const retryAfter = response?.headers.get('Retry-After');
        const serverDelay = retryAfter
          ? /^\d+$/.test(retryAfter)
            ? Number(retryAfter) * 1000
            : Math.max(0, Date.parse(retryAfter) - Date.now())
          : 0;
        if (this.disposed) {
          this.buffer.fail();
        } else if (
          !transient ||
          serverDelay > 60000 ||
          ++this.failures >= MAX_ATTEMPTS
        ) {
          this.buffer.fail();
        } else {
          const rest: string[] = [];
          for (
            let event = this.buffer.read();
            event !== undefined;
            event = this.buffer.read()
          )
            rest.push(event);
          [...batch, ...rest].forEach((event) => this.buffer.add(event));
          this.nextAttempt =
            Date.now() +
            Math.max(5000 * 2 ** (this.failures - 1), serverDelay || 0);
        }
        break;
      }
    } finally {
      this.posting = false;
      activeFlushes--;
    }
  }
}
