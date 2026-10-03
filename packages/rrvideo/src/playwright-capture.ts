import * as fs from 'fs-extra';
import { chromium } from 'playwright';
import type { eventWithTime } from '@rrweb/types';
import { PLAYWRIGHT_MAX_SCALE, getHtml } from './replay-html';
import type { ResolvedRRvideoConfig, ViewportSize } from './types';

export async function captureWithPlaywrightVideo(
  events: eventWithTime[],
  viewport: ViewportSize,
  config: ResolvedRRvideoConfig,
): Promise<string> {
  const defaultVideoDir = '__rrvideo__temp__';
  const browser = await chromium.launch({
    headless: config.headless,
  });
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: defaultVideoDir,
      size: viewport,
    },
  });
  const page = await context.newPage();
  await page.goto('about:blank');
  page.on('console', (msg) => {
    console.log('[PAGE CONSOLE]', msg.type(), msg.text());
  });
  page.on('pageerror', (error) => {
    console.error('[PAGE ERROR]', error.message);
  });

  await page.exposeFunction(
    'onReplayProgressUpdate',
    (data: { payload: number }) => {
      config.onProgressUpdate(data.payload);
    },
  );

  await new Promise<void>((resolve, reject) => {
    const timeoutBuffer = 120000;
    const videoStartTime = events[0]?.timestamp;
    const videoEndTime = events[events.length - 1]?.timestamp;
    const videoDuration = videoEndTime - videoStartTime;
    const videoPlaybackSpeed = config.rrwebPlayer.speed || 1;
    const expectedPlaybackTime = videoDuration / videoPlaybackSpeed;
    console.log(
      `[DEBUG] Expected playback time: ${expectedPlaybackTime}ms (video duration: ${videoDuration}ms, playback speed: ${videoPlaybackSpeed}x)`,
    );
    const totalTimeout = expectedPlaybackTime + timeoutBuffer;
    const timeout = setTimeout(() => {
      console.error('[DEBUG] Replay timeout - finish event never fired');
      reject(new Error('Replay timeout'));
    }, totalTimeout);

    void page
      .exposeFunction('onReplayFinish', () => {
        console.log('[DEBUG] Replay finished');
        clearTimeout(timeout);
        resolve();
      })
      .then(() => {
        console.log('[DEBUG] Setting page content');
        return page.setContent(
          getHtml(events, config, {
            scale: (config.resolutionRatio ?? 1) * PLAYWRIGHT_MAX_SCALE,
            startPlayback: true,
          }),
        );
      })
      .then(() => {
        console.log('[DEBUG] Page content set successfully');
      })
      .catch((err) => {
        console.error('[DEBUG] Error setting page content:', err);
        clearTimeout(timeout);
        reject(err);
      });
  });
  const videoPath = (await page.video()?.path()) || '';
  const cleanFiles = async (filePath: string) => {
    await fs.remove(filePath);
    if ((await fs.readdir(defaultVideoDir)).length === 0) {
      await fs.remove(defaultVideoDir);
    }
  };
  await context.close();
  await Promise.all([
    fs
      .move(videoPath, config.output, { overwrite: true })
      .catch((e) => {
        console.error(
          "Can't create video file. Please check the output path.",
          e,
        );
      })
      .finally(() => void cleanFiles(videoPath)),
    browser.close(),
  ]);
  return config.output;
}
