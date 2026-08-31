import * as fs from 'fs-extra';
import type { eventWithTime } from '@rrweb/types';
import { resolveConfig } from './config';
import { captureWithFfmpeg } from './ffmpeg-capture';
import { captureWithPlaywrightVideo } from './playwright-capture';
import { mapPool } from './parallel';
import { PLAYWRIGHT_MAX_SCALE } from './replay-html';
import { getMaxViewport, scaleViewport } from './timeline';
import type {
  RRvideoConfig,
  ResolvedRRvideoConfig,
  ViewportSize,
} from './types';

export type { RRvideoConfig, CaptureBackend } from './types';
export { getFrameTimeOffsets, estimateFrameCount } from './timeline';
export { buildFfmpegArgs } from './ffmpeg';
export { CHROMIUM_LAUNCH_ARGS } from './ffmpeg-capture';
export { resolveCapture } from './config';

function viewportForCapture(
  events: eventWithTime[],
  config: ResolvedRRvideoConfig,
): ViewportSize {
  const maxViewport = getMaxViewport(events);
  if (config.capture === 'ffmpeg') {
    const playerWidth = config.rrwebPlayer.width;
    const playerHeight = config.rrwebPlayer.height;
    if (typeof playerWidth === 'number' && typeof playerHeight === 'number') {
      return scaleViewport({ width: playerWidth, height: playerHeight }, 1);
    }
    return scaleViewport(maxViewport, config.resolutionRatio);
  }
  return scaleViewport(
    maxViewport,
    (config.resolutionRatio ?? 1) * PLAYWRIGHT_MAX_SCALE,
  );
}

export async function transformToVideo(options: RRvideoConfig) {
  const config = resolveConfig(options);
  const events = JSON.parse(
    fs.readFileSync(config.input, 'utf-8'),
  ) as eventWithTime[];

  const viewport = viewportForCapture(events, config);
  Object.assign(config.rrwebPlayer, viewport);

  if (config.capture === 'ffmpeg') {
    return captureWithFfmpeg(events, viewport, config);
  }
  return captureWithPlaywrightVideo(events, viewport, config);
}

export type TransformManyOptions = {
  concurrency?: number;
};

/**
 * Render many sessions in parallel. Each job launches its own Chromium and
 * ffmpeg process. Keep `concurrency` at or below CPU cores — 1080p/60fps
 * screenshotting is CPU-bound.
 */
export async function transformMany(
  jobs: RRvideoConfig[],
  options: TransformManyOptions = {},
): Promise<string[]> {
  return mapPool(jobs, options.concurrency ?? 2, (job) =>
    transformToVideo(job),
  );
}
