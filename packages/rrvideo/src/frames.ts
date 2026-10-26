import { spawn } from 'child_process';
import { once } from 'events';
import { chromium, type CDPSession, type Page } from 'playwright';
import { installClock } from './clock';

type PageWindow = {
  __clock: {
    advance(ms: number): Promise<void>;
    sleep(ms: number): Promise<void>;
  };
  __finished?: boolean;
  replayer: { getReplayer(): { getCurrentTime(): number } };
};

/** Injected before the player script. */
export const clockScript = `<script>
  (${installClock.toString()})();
  window.onReplayFinish = () => { window.__finished = true; };
  window.onReplayProgressUpdate = () => {};
</script>`;

// With these, Chrome only draws on HeadlessExperimental.beginFrame and takes
// CSS animation time from it, so animations follow the virtual clock too.
// Only chrome-headless-shell on Linux supports it; elsewhere we screenshot.
const BEGIN_FRAME_ARGS = [
  '--deterministic-mode',
  '--enable-begin-frame-control',
  '--disable-new-content-rendering-timeout',
  '--run-all-compositor-stages-before-draw',
  '--disable-threaded-animation',
  '--disable-threaded-scrolling',
  '--disable-checker-imaging',
  '--disable-image-animation-resync',
];

function frameGrabber(
  page: Page,
  cdp: CDPSession,
  beginFrame: boolean,
  interval: number,
) {
  const screenshot = { format: 'jpeg', quality: 90 } as const;
  if (!beginFrame) {
    return async () => {
      const { data } = await cdp.send('Page.captureScreenshot', {
        ...screenshot,
        optimizeForSpeed: true,
      });
      return Buffer.from(data, 'base64');
    };
  }
  let frameTimeTicks = 1000;
  let last: Buffer | undefined;
  return async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const { screenshotData } = await cdp.send(
        'HeadlessExperimental.beginFrame',
        {
          frameTimeTicks: (frameTimeTicks += interval),
          interval,
          screenshot,
        },
      );
      if (screenshotData) last = Buffer.from(screenshotData, 'base64');
      if (last) return last; // empty when nothing was redrawn
      // No screenshot comes back without a redraw, and Page.captureScreenshot
      // hangs under BeginFrame control, so repaint an invisible pixel.
      await page.evaluate((alpha) => {
        const px =
          document.getElementById('rrvideo-px') ||
          document.body.appendChild(
            Object.assign(document.createElement('div'), { id: 'rrvideo-px' }),
          );
        px.style.cssText = `position:fixed;top:0;left:0;width:1px;height:1px;background:rgba(0,0,0,${alpha})`;
      }, attempt / 1000);
    }
    throw new Error('HeadlessExperimental.beginFrame produced no frame');
  };
}

/** Pipes JPEG frames into an H.264 MP4. */
function encode(output: string, fps: number) {
  const args = `-y -loglevel error -f image2pipe -framerate ${fps} -i - -c:v libx264 -pix_fmt yuv420p -movflags +faststart`;
  const ffmpeg = spawn('ffmpeg', [...args.split(' '), output], {
    stdio: ['pipe', 'ignore', 'inherit'],
  });
  const done = new Promise<void>((resolve, reject) => {
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited with ${String(code)}`)),
    );
  });
  // Failures surface through `done`.
  done.catch(() => undefined);
  ffmpeg.stdin.on('error', () => undefined);
  return {
    async write(frame: Buffer) {
      if (!ffmpeg.stdin.write(frame))
        await Promise.race([once(ffmpeg.stdin, 'drain'), done]);
    },
    async end() {
      ffmpeg.stdin.end();
      await done;
    },
    kill: () => ffmpeg.kill(),
  };
}

export async function captureFrames(options: {
  html: string;
  output: string;
  viewport: { width: number; height: number };
  fps: number;
  durationMs: number;
  speed: number;
  headless: boolean;
  onProgressUpdate: (percent: number) => void;
}) {
  const { fps, durationMs } = options;
  const interval = 1000 / fps;
  const beginFrame = process.platform === 'linux' && options.headless;
  const encoder = encode(options.output, fps);

  const browser = await chromium.launch({
    headless: options.headless,
    args: beginFrame ? BEGIN_FRAME_ARGS : [],
  });
  try {
    const page = await browser.newPage({ viewport: options.viewport });
    page.on('pageerror', (error) =>
      console.error('[PAGE ERROR]', error.message),
    );
    const cdp = await page.context().newCDPSession(page);
    await page.setContent(options.html);
    await page.evaluate(() => {
      const w = window as unknown as PageWindow;
      // Run the player's mount timers, then give the first snapshot's images
      // and fonts up to 5s of real time to load.
      return w.__clock.advance(0).then(() => {
        const doc = document.querySelector('iframe')?.contentDocument;
        if (!doc) return;
        const loads = Array.from(doc.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((r) => {
                img.addEventListener('load', r);
                img.addEventListener('error', r);
              }),
          );
        return Promise.race([
          Promise.all([...loads, doc.fonts.ready]),
          w.__clock.sleep(5000),
        ]);
      });
    });

    const grab = frameGrabber(page, cdp, beginFrame, interval);
    // speed and skipInactive are applied by the replayer; this only bounds the loop.
    const maxFrames = durationMs / options.speed / interval + fps;
    for (let i = 0; i < maxFrames; i++) {
      await encoder.write(await grab());
      const { finished, time } = await page.evaluate((ms) => {
        const w = window as unknown as PageWindow;
        return w.__clock.advance(ms).then(() => ({
          finished: w.__finished,
          time: w.replayer.getReplayer().getCurrentTime(),
        }));
      }, interval);
      if (finished) {
        await encoder.write(await grab());
        break;
      }
      options.onProgressUpdate(Math.min(time / durationMs, 0.99));
    }
    await encoder.end();
    options.onProgressUpdate(1);
  } finally {
    encoder.kill();
    await browser.close();
  }
}
