import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import { FfmpegJpegPipe } from '../src/ffmpeg';

jest.setTimeout(15000);

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function childProcess(encoder: FfmpegJpegPipe): ChildProcessWithoutNullStreams {
  return (encoder as unknown as { process: ChildProcessWithoutNullStreams })
    .process;
}

async function waitForFile(file: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(file)) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${file}`);
    }
    await pause(5);
  }
}

async function waitForChildExit(
  child: ChildProcessWithoutNullStreams,
  timeoutMs = 2000,
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out waiting for fake ffmpeg to exit')),
      timeoutMs,
    );
    child.once('close', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

describe('encoder lifecycle', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rrvideo-failure-'));
  afterAll(() => fs.removeSync(dir));
  function executable(name: string, body: string) {
    const file = path.join(dir, name);
    fs.writeFileSync(file, `#!${process.execPath}\n${body}`, { mode: 0o755 });
    return file;
  }
  it('retains startup failure until the caller writes, without an unhandled rejection', async () => {
    const encoder = new FfmpegJpegPipe({
      fps: 30,
      outputPath: path.join(dir, 'x.mp4'),
      ffmpegPath: path.join(dir, 'missing'),
    });
    await pause(50);
    await expect(encoder.write(Buffer.from('frame'))).rejects.toThrow(
      /start ffmpeg/,
    );
    encoder.kill();
  });

  it('times out when the encoder stops reading a blocked write', async () => {
    const ready = path.join(dir, 'blocked.ready');
    const encoder = new FfmpegJpegPipe({
      fps: 30,
      outputPath: path.join(dir, 'blocked.mp4'),
      ffmpegPath: executable(
        'blocked',
        `
        require('fs').writeFileSync(${JSON.stringify(
          ready,
        )}, String(process.pid));
        process.stdin.pause();
        setInterval(() => {}, 1000);
      `,
      ),
      timeoutMs: 100,
    });

    try {
      await waitForFile(ready);
      const write = encoder.write(Buffer.alloc(16 * 1024 * 1024));
      await expect(write).rejects.toThrow('ffmpeg write timed out after 100ms');
    } finally {
      await encoder.dispose();
    }
  });

  it('unblocks a pending write when the encoder exits nonzero', async () => {
    const ready = path.join(dir, 'nonzero.ready');
    const encoder = new FfmpegJpegPipe({
      fps: 30,
      outputPath: path.join(dir, 'nonzero.mp4'),
      ffmpegPath: executable(
        'nonzero',
        `
        require('fs').writeFileSync(${JSON.stringify(
          ready,
        )}, String(process.pid));
        process.stderr.write('fixture encoder diagnostic\\n');
        process.stdin.pause();
        setTimeout(() => process.exit(23), 50);
      `,
      ),
      timeoutMs: 1000,
    });

    try {
      await waitForFile(ready);
      const child = childProcess(encoder);
      const startedAt = Date.now();
      await expect(
        encoder.write(Buffer.alloc(16 * 1024 * 1024)),
      ).rejects.toThrow(/(?=.*code 23)(?=.*fixture encoder diagnostic)/);
      expect(Date.now() - startedAt).toBeLessThan(1000);
      await waitForChildExit(child);
    } finally {
      await encoder.dispose();
    }
  });

  it('rejects a pending write when the encoder closes stdin but stays alive', async () => {
    const ready = path.join(dir, 'stdin-close.ready');
    const timeoutMs = 1000;
    const encoder = new FfmpegJpegPipe({
      fps: 30,
      outputPath: path.join(dir, 'stdin-close.mp4'),
      ffmpegPath: executable(
        'stdin-close',
        `
        require('fs').writeFileSync(${JSON.stringify(
          ready,
        )}, String(process.pid));
        let sawInput = false;
        process.stdin.on('data', () => {
          if (sawInput) return;
          sawInput = true;
          process.stdin.pause();
          setTimeout(() => process.stdin.destroy(), 50);
        });
        process.stdin.resume();
        setInterval(() => {}, 1000);
      `,
      ),
      timeoutMs,
    });

    try {
      await waitForFile(ready);
      const child = childProcess(encoder);
      const startedAt = Date.now();
      await expect(
        encoder.write(Buffer.alloc(16 * 1024 * 1024)),
      ).rejects.toThrow();
      expect(Date.now() - startedAt).toBeLessThan(timeoutMs + 250);
      expect(child.exitCode).toBeNull();
      expect(child.signalCode).toBeNull();
      const exited = waitForChildExit(child);
      await encoder.dispose();
      await exited;
    } finally {
      await encoder.dispose();
    }
  });

  it('disposes a live fake encoder without leaving its child alive', async () => {
    const ready = path.join(dir, 'live.ready');
    const encoder = new FfmpegJpegPipe({
      fps: 30,
      outputPath: path.join(dir, 'live.mp4'),
      ffmpegPath: executable(
        'live',
        `
        require('fs').writeFileSync(${JSON.stringify(
          ready,
        )}, String(process.pid));
        process.stdin.pause();
        setInterval(() => {}, 1000);
      `,
      ),
      timeoutMs: 1000,
    });

    try {
      await waitForFile(ready);
      const child = childProcess(encoder);
      const exited = waitForChildExit(child);
      await encoder.dispose();
      await exited;
      expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
    } finally {
      await encoder.dispose();
    }
  });

  it('rejects premature successful exit rather than accepting a truncated movie', async () => {
    const ready = path.join(dir, 'exit.ready');
    const encoder = new FfmpegJpegPipe({
      fps: 30,
      outputPath: path.join(dir, 'x.mp4'),
      ffmpegPath: executable(
        'exit',
        `
        require('fs').writeFileSync(${JSON.stringify(
          ready,
        )}, String(process.pid));
        process.exit(0);
      `,
      ),
    });
    try {
      await waitForFile(ready);
      await waitForChildExit(childProcess(encoder));
      await expect(encoder.end()).rejects.toThrow(/before/);
    } finally {
      await encoder.dispose();
    }
  });
});
