import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

export type FfmpegEncodeOptions = {
  fps: number;
  outputPath: string;
  ffmpegPath?: string;
  crf?: number;
  preset?: string;
  timeoutMs?: number;
};

export function buildFfmpegArgs(options: FfmpegEncodeOptions): string[] {
  return [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'image2pipe',
    '-vcodec',
    'mjpeg',
    '-framerate',
    String(options.fps),
    '-i',
    'pipe:0',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    options.preset ?? 'veryfast',
    '-crf',
    String(options.crf ?? 18),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    options.outputPath,
  ];
}

export class FfmpegJpegPipe {
  public framesWritten = 0;
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly closed: Promise<void>;
  private readonly failure: Promise<never>;
  private rejectFailure!: (error: Error) => void;
  private error?: Error;
  private pipeError?: Error;
  private stderr = '';
  private ending = false;
  private killed = false;
  private readonly timeoutMs: number;

  constructor(options: FfmpegEncodeOptions) {
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.failure = new Promise<never>((_, reject) => {
      this.rejectFailure = reject;
    });
    // Failure may precede the first write while Chromium is launching.
    void this.failure.catch(() => {
      // guard/write/end report this retained failure to the caller.
    });
    const ffmpegPath = options.ffmpegPath || 'ffmpeg';
    this.process = spawn(ffmpegPath, buildFfmpegArgs(options), {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.process.stdout.resume();
    this.process.stderr.on('data', (chunk: Buffer) => {
      this.stderr = (this.stderr + chunk.toString('utf8')).slice(-65536);
    });
    this.process.on('error', (error) =>
      this.fail(
        new Error(`Failed to start ffmpeg (${ffmpegPath}): ${error.message}`),
      ),
    );
    this.process.stdin.on('error', (error) => {
      this.pipeError = error;
    });
    this.closed = new Promise<void>((resolve) => {
      this.process.once('close', (code, signal) => {
        if (!this.killed && (code !== 0 || !this.ending)) {
          this.fail(
            new Error(
              `ffmpeg exited ${
                !this.ending ? 'before input completed ' : ''
              }(code ${code ?? 'unknown'}, signal ${signal ?? 'none'}): ${
                this.stderr
              }`,
            ),
          );
        }
        resolve();
      });
    });
  }

  private fail(error: Error): void {
    if (this.error || this.killed) return;
    this.error = error;
    this.rejectFailure(error);
  }

  async guard<T>(
    operation: Promise<T>,
    label: string,
    timeoutMs = this.timeoutMs,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        this.failure,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async reportPipeError(timeoutMs: number): Promise<never> {
    try {
      // EPIPE commonly arrives before close/stderr. Allow the remaining operation
      // budget for FFmpeg's actual diagnostic, but never wait indefinitely.
      await this.guard(
        this.closed,
        'ffmpeg shutdown after pipe failure',
        timeoutMs,
      );
    } catch {
      // close retains its richer error; a live child instead reaches the deadline.
    }
    if (this.error) throw this.error;
    const error = new Error(
      `ffmpeg input failed: ${this.pipeError?.message ?? 'pipe closed'}${
        this.stderr ? `: ${this.stderr}` : ''
      }`,
    );
    this.fail(error);
    throw error;
  }

  async write(frame: Buffer): Promise<void> {
    if (this.error) throw this.error;
    if (this.pipeError) return this.reportPipeError(this.timeoutMs);
    if (this.ending || this.killed) throw new Error('ffmpeg input is closed');
    const deadline = Date.now() + this.timeoutMs;
    try {
      await this.guard(
        new Promise<void>((resolve, reject) => {
          this.process.stdin.write(frame, (error) => {
            if (error) {
              this.pipeError = error;
              reject(error);
            } else resolve();
          });
        }),
        'ffmpeg write',
      );
    } catch (error) {
      if (this.error) throw this.error;
      if (this.pipeError)
        return this.reportPipeError(Math.max(0, deadline - Date.now()));
      throw error;
    }
    this.framesWritten++;
  }

  async end(): Promise<void> {
    if (this.error) throw this.error;
    if (this.pipeError) return this.reportPipeError(this.timeoutMs);
    this.ending = true;
    this.process.stdin.end();
    await this.guard(this.closed, 'ffmpeg finalization');
    if (this.error) throw this.error;
  }

  kill(): void {
    this.killed = true;
    this.process.stdin.destroy();
    if (this.process.exitCode === null) this.process.kill('SIGKILL');
  }

  async dispose(): Promise<void> {
    this.kill();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.closed,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, this.timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
