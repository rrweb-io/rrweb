import { spawn } from 'child_process';
import { once } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { chromium, type CDPSession, type Page } from 'playwright';
import type { eventWithTime } from '@rrweb/types';
import { installClock } from './clock';
import { actionTimes, heldFrames, readStatus } from './idle';

export type PageWindow = {
  __clock: { advance(ms: number): Promise<void> };
  __finished?: boolean;
  replayer: {
    getReplayer(): {
      getCurrentTime(): number;
      speedService: { state: { context: { timer: { speed: number } } } };
    };
  };
};

type Driver = {
  advance(ms: number): Promise<void>;
  grab(): Promise<Buffer>;
};

const TIMEOUT_MS = 30_000;
const JPEG = { format: 'jpeg', quality: 90 } as const;

const hooksScript = `<script>
  window.onReplayFinish = () => { window.__finished = true; };
  window.onReplayProgressUpdate = () => {};
</script>`;
const clockScript = `<script>(${installClock.toString()})();</script>`;

// chrome-headless-shell (Playwright's headless default) on Linux can be driven
// frame by frame: Chrome's virtual time holds timers, rAF and CSS animations
// between frames, and HeadlessExperimental.beginFrame draws one. Elsewhere
// clock.ts fakes the replayer's timers and we screenshot, so CSS animations
// run in real time.
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

/** Chrome can hang on these calls rather than fail. */
function withTimeout<T>(promise: Promise<T>, label: string, ms = TIMEOUT_MS) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    void promise.then(resolve, reject).then(() => clearTimeout(timer));
  });
}

async function launch(headless: boolean) {
  if (process.platform === 'linux' && headless) {
    const browser = await chromium.launch({ headless, args: BEGIN_FRAME_ARGS });
    const cdp = await browser.newBrowserCDPSession();
    const { product } = await cdp.send('Browser.getVersion');
    if (product.startsWith('HeadlessChrome'))
      return { browser, beginFrame: true };
    await browser.close();
  }
  return { browser: await chromium.launch({ headless }), beginFrame: false };
}

async function beginFrameDriver(page: Page, cdp: CDPSession): Promise<Driver> {
  const { virtualTimeTicksBase } = await cdp.send(
    'Emulation.setVirtualTimePolicy',
    { policy: 'pause' },
  );
  let time = 0;
  let last: Buffer | undefined;
  return {
    async advance(ms) {
      const expired = new Promise((r) =>
        cdp.once('Emulation.virtualTimeBudgetExpired', r),
      );
      await cdp.send('Emulation.setVirtualTimePolicy', {
        policy: 'advance',
        budget: ms,
      });
      await withTimeout(expired, 'Virtual time advance');
      time += ms;
    },
    async grab() {
      for (let attempt = 0; attempt < 5; attempt++) {
        const { screenshotData } = await withTimeout(
          cdp.send('HeadlessExperimental.beginFrame', {
            // Ticks must strictly increase; retries stay well inside the frame.
            frameTimeTicks: virtualTimeTicksBase + 1 + time + attempt / 100,
            screenshot: JPEG,
          }),
          'HeadlessExperimental.beginFrame',
        );
        if (screenshotData) last = Buffer.from(screenshotData, 'base64');
        if (last) return last; // empty when nothing was redrawn
        // The first frame needs a redraw, and Page.captureScreenshot hangs
        // under BeginFrame control, so repaint an invisible pixel.
        await page.evaluate((alpha) => {
          const px =
            document.getElementById('rrvideo-px') ||
            document.body.appendChild(
              Object.assign(document.createElement('div'), {
                id: 'rrvideo-px',
              }),
            );
          px.style.cssText = `position:fixed;top:0;left:0;width:1px;height:1px;background:rgba(0,0,0,${alpha})`;
        }, (attempt + 1) / 1000);
      }
      throw new Error('HeadlessExperimental.beginFrame produced no frame');
    },
  };
}

function screenshotDriver(page: Page, cdp: CDPSession): Driver {
  return {
    advance: (ms) =>
      page.evaluate(
        (ms) => (window as unknown as PageWindow).__clock.advance(ms),
        ms,
      ),
    async grab() {
      const { data } = await withTimeout(
        cdp.send('Page.captureScreenshot', { ...JPEG, optimizeForSpeed: true }),
        'Page.captureScreenshot',
      );
      return Buffer.from(data, 'base64');
    },
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

/** Wait (in real time, up to 5s) for the first snapshot's images and fonts. */
async function waitForAssets(page: Page) {
  const loaded = page.evaluate(() => {
    const doc = document.querySelector('iframe')?.contentDocument;
    if (!doc) return;
    const images = Array.from(doc.images).filter((img) => !img.complete);
    const loads = images.map(
      (img) =>
        new Promise((r) => {
          img.addEventListener('load', r);
          img.addEventListener('error', r);
        }),
    );
    return Promise.all([...loads, doc.fonts.ready]).then(() => undefined);
  });
  await withTimeout(loaded, 'Asset load', 5000).catch(() => undefined);
}

export async function captureFrames(options: {
  html: (prelude: string) => string;
  output: string;
  viewport: { width: number; height: number };
  fps: number;
  events: eventWithTime[];
  speed: number;
  headless: boolean;
  onProgressUpdate: (percent: number) => void;
}) {
  const { fps, events, output } = options;
  const actions = actionTimes(events);
  const durationMs = actions.all[actions.all.length - 1];
  // Encode next to the output and move it into place only on success.
  const tmp = path.join(
    path.dirname(output),
    `.${process.pid}.${path.basename(output)}`,
  );
  const encoder = encode(tmp, fps);
  const { browser, beginFrame } = await launch(options.headless);
  try {
    const page = await browser.newPage({ viewport: options.viewport });
    page.on('pageerror', (error) =>
      console.error('[PAGE ERROR]', error.message),
    );
    const cdp = await page.context().newCDPSession(page);
    const driver = beginFrame
      ? await beginFrameDriver(page, cdp)
      : screenshotDriver(page, cdp);
    await page.setContent(
      options.html(hooksScript + (beginFrame ? '' : clockScript)),
    );
    await driver.advance(1); // run the player's mount timers
    await waitForAssets(page);

    // speed and skipInactive are applied by the replayer; this only bounds the loop.
    const maxFrames = (durationMs / options.speed / 1000) * fps + fps;
    let time = 0;
    for (let frame = 0; frame < maxFrames; ) {
      const image = await driver.grab();
      // Read after drawing: in beginFrame mode the replayer only catches up
      // with the clock in the frame's rAF.
      const status = await readStatus(page);
      // Render once and repeat the picture over idle stretches.
      const held = status.finished
        ? 1
        : heldFrames(status, actions, frame, time, fps);
      for (let i = 0; i < held; i++) await encoder.write(image);
      if (status.finished) break;
      frame += held;
      // Whole milliseconds, as events are recorded, so an event on a frame
      // boundary can't drift to the next frame through float rounding.
      const next = Math.floor((frame * 1000) / fps);
      await driver.advance(next - time);
      time = next;
      options.onProgressUpdate(Math.min(status.current / durationMs, 0.99));
    }
    await encoder.end();
    await fs.move(tmp, output, { overwrite: true });
    options.onProgressUpdate(1);
  } finally {
    encoder.kill();
    await browser.close();
    await fs.remove(tmp);
  }
}
