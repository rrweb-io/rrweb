import * as fs from 'fs-extra';
import * as path from 'path';
import type { eventWithTime } from '@rrweb/types';
import { FfmpegJpegPipe } from './ffmpeg';
import { FrameSource, launchCaptureBrowser } from './frame-source';
import { estimateFrameCount, getSessionDurationMs } from './timeline';
import type { ResolvedRRvideoConfig, ViewportSize } from './types';
export { CHROMIUM_LAUNCH_ARGS } from './frame-source';

export async function captureWithFfmpeg(
  events: eventWithTime[],
  viewport: ViewportSize,
  config: ResolvedRRvideoConfig,
): Promise<string> {
  const count = estimateFrameCount(
    getSessionDurationMs(events),
    config.fps,
    config.rrwebPlayer.speed ?? 1,
  );
  const browser = await launchCaptureBrowser(config);
  let encoder: FfmpegJpegPipe | undefined;
  let tempDir: string | undefined;
  try {
    await fs.ensureDir(path.dirname(config.output));
    tempDir = await fs.mkdtemp(
      path.join(path.dirname(config.output), '.rrvideo-'),
    );
    const tempOutput = path.join(tempDir, path.basename(config.output));
    encoder = new FfmpegJpegPipe({
      fps: config.fps,
      outputPath: tempOutput,
      ffmpegPath: config.ffmpegPath,
      crf: config.crf,
      preset: config.x264Preset,
      timeoutMs: config.captureTimeoutMs,
    });
    const source = await encoder.guard(
      FrameSource.create(browser, events, viewport, config),
      'replay initialization',
    );
    for (let i = 0; i < count; i++) {
      const frame = await encoder.guard(source.frame(i), `capture frame ${i}`);
      await encoder.write(frame);
      config.onProgressUpdate((i + 1) / (count + 1));
    }
    await encoder.guard(source.finish(), 'replay completion');
    await encoder.end();
    await fs.move(tempOutput, config.output, { overwrite: true });
    config.onProgressUpdate(1);
    return config.output;
  } finally {
    try {
      await encoder?.dispose();
    } finally {
      await browser.close();
      if (tempDir) await fs.remove(tempDir);
    }
  }
}
