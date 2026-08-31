import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';

export type FfmpegEncodeOptions = {
  fps: number;
  outputPath: string;
  ffmpegPath?: string;
  crf?: number;
  preset?: string;
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
  private readonly stderrChunks: Buffer[] = [];
  private readonly closed: Promise<void>;
  private killed = false;

  constructor(options: FfmpegEncodeOptions) {
    const ffmpegPath = options.ffmpegPath || 'ffmpeg';
    this.process = spawn(ffmpegPath, buildFfmpegArgs(options), {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.process.stderr.on('data', (chunk: Buffer) => {
      this.stderrChunks.push(chunk);
    });
    this.closed = new Promise<void>((resolve, reject) => {
      this.process.once('error', (error) => {
        reject(
          new Error(`Failed to start ffmpeg (${ffmpegPath}): ${error.message}`),
        );
      });
      this.process.once('close', (code) => {
        if (this.killed) {
          resolve();
          return;
        }
        if (code === 0) {
          resolve();
          return;
        }
        const stderr = Buffer.concat(this.stderrChunks).toString('utf-8');
        reject(
          new Error(
            `ffmpeg exited with code ${code ?? 'unknown'}${
              stderr ? `:\n${stderr}` : ''
            }`,
          ),
        );
      });
    });
  }

  async write(frame: Buffer): Promise<void> {
    this.framesWritten += 1;
    const stdin = this.process.stdin;
    if (stdin.write(frame)) return;
    await new Promise<void>((resolve, reject) => {
      const onDrain = () => {
        stdin.off('error', onError);
        resolve();
      };
      const onError = (error: Error) => {
        stdin.off('drain', onDrain);
        reject(error);
      };
      stdin.once('drain', onDrain);
      stdin.once('error', onError);
    });
  }

  async end(): Promise<void> {
    this.process.stdin.end();
    await this.closed;
  }

  kill(): void {
    this.killed = true;
    if (!this.process.killed) {
      this.process.kill('SIGKILL');
    }
  }
}
