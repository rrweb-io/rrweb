import { chromium } from 'playwright';
import type { eventWithTime } from '@rrweb/types';
import { FfmpegJpegPipe } from './ffmpeg';
import { getHtml } from './replay-html';
import { getFrameTimeOffsets, getSessionDurationMs } from './timeline';
import type { ResolvedRRvideoConfig, ViewportSize } from './types';

export const CHROMIUM_LAUNCH_ARGS = [
  '--disable-frame-rate-limit',
  '--disable-gpu-vsync',
  '--autoplay-policy=no-user-gesture-required',
  '--font-render-hinting=none',
  '--hide-scrollbars',
];

type ReplayerWindow = {
  replayer: {
    goto: (timeOffset: number, play?: boolean) => void;
  };
};

export async function captureWithFfmpeg(
  events: eventWithTime[],
  viewport: ViewportSize,
  config: ResolvedRRvideoConfig,
): Promise<string> {
  const speed = config.rrwebPlayer.speed || 1;
  const durationMs = getSessionDurationMs(events);
  const offsets = getFrameTimeOffsets(durationMs, config.fps, speed);
  const encoder = new FfmpegJpegPipe({
    fps: config.fps,
    outputPath: config.output,
    ffmpegPath: config.ffmpegPath,
    crf: config.crf,
    preset: config.x264Preset,
  });

  const browser = await chromium.launch({
    headless: config.headless,
    args: CHROMIUM_LAUNCH_ARGS,
  });

  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: config.pixelRatio,
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      console.log('[PAGE CONSOLE]', msg.type(), msg.text());
    });
    page.on('pageerror', (error) => {
      console.error('[PAGE ERROR]', error.message);
    });

    await page.setContent(
      getHtml(events, config, { scale: 1, startPlayback: false }),
    );
    await page.waitForFunction(() => {
      const w = window as unknown as {
        replayer?: unknown;
        __rrvideoInitError?: string | null;
      };
      return Boolean(w.replayer) || Boolean(w.__rrvideoInitError);
    });
    const initError = await page.evaluate(() => {
      return (window as unknown as { __rrvideoInitError?: string | null })
        .__rrvideoInitError;
    });
    if (initError) {
      throw new Error(`Failed to initialize rrweb-player: ${initError}`);
    }
    await page.waitForFunction(() => {
      const replayer = (window as unknown as ReplayerWindow).replayer;
      return typeof replayer?.goto === 'function';
    });
    // Let rrweb-player's mount setTimeout(0) resize land before the first frame.
    await page.evaluate(
      () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
    );

    for (let i = 0; i < offsets.length; i++) {
      const timeOffset = offsets[i];
      await page.evaluate((offset) => {
        (window as unknown as ReplayerWindow).replayer.goto(offset, false);
      }, timeOffset);
      const frame = await page.screenshot({
        type: 'jpeg',
        quality: config.quality,
      });
      await encoder.write(frame);
      if (offsets.length > 1) {
        config.onProgressUpdate(i / (offsets.length - 1));
      }
    }

    await encoder.end();
    await context.close();
  } catch (error) {
    encoder.kill();
    throw error;
  } finally {
    await browser.close();
  }

  return config.output;
}
