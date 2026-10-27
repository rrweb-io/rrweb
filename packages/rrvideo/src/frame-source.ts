import { chromium, type Browser, type Page, type CDPSession } from 'playwright';
import type { eventWithTime } from '@rrweb/types';
import type { ResolvedRRvideoConfig, ViewportSize } from './types';
import { getHtml } from './replay-html';
import { compositorFrameTick } from './compositor-ticks';

export const CHROMIUM_LAUNCH_ARGS = [
  '--disable-frame-rate-limit',
  '--disable-gpu-vsync',
  '--autoplay-policy=no-user-gesture-required',
  '--font-render-hinting=none',
  '--hide-scrollbars',
];
// Chrome headless shell's documented beginFrame requirements.
const COMPOSITOR_ARGS = [
  '--deterministic-mode',
  '--enable-begin-frame-control',
  '--disable-new-content-rendering-timeout',
  '--run-all-compositor-stages-before-draw',
  '--disable-threaded-animation',
  '--disable-threaded-scrolling',
  '--disable-checker-imaging',
  '--disable-image-animation-resync',
  '--enable-surface-synchronization',
];
type ReplayWindow = Window & {
  __rrvideoInitError?: string;
  __rrvideoAdvanceFrame: () => void;
  replayer: {
    goto(offset: number, play: boolean): void;
    getReplayer(): { play(offset: number): void };
  };
};

export function launchCaptureBrowser(
  config: ResolvedRRvideoConfig,
): Promise<Browser> {
  if (
    config.capture === 'compositor' &&
    !['linux', 'win32'].includes(process.platform)
  ) {
    throw new Error(
      'Compositor capture requires Linux or Windows chrome-headless-shell; use capture: ffmpeg on macOS.',
    );
  }
  // Playwright's default headless executable is chromium-headless-shell.
  return chromium.launch({
    headless: config.headless,
    executablePath: config.browserPath,
    timeout: config.captureTimeoutMs,
    args: [
      // Unlimited automatic drawing conflicts with externally scheduled frames.
      ...CHROMIUM_LAUNCH_ARGS.filter(
        (arg) =>
          config.capture !== 'compositor' ||
          !['--disable-frame-rate-limit', '--disable-gpu-vsync'].includes(arg),
      ),
      ...(config.capture === 'compositor' ? COMPOSITOR_ARGS : []),
    ],
  });
}

export class FrameSource {
  private session?: CDPSession;
  private previousTime = 0;
  private frameTimeBase = 0;
  private replayError?: Error;
  private constructor(
    private page: Page,
    private config: ResolvedRRvideoConfig,
  ) {}

  static async create(
    browser: Browser,
    events: eventWithTime[],
    viewport: ViewportSize,
    config: ResolvedRRvideoConfig,
  ): Promise<FrameSource> {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: config.pixelRatio,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(config.captureTimeoutMs);
    const source = new FrameSource(page, config);
    page.on('console', (message) =>
      console.log('[PAGE CONSOLE]', message.type(), message.text()),
    );
    page.on('pageerror', (error) => {
      console.error('[PAGE ERROR]', error.message);
      // Unavailable media can reject play() without stopping rrweb. Only a
      // synchronous replay callback failure stops the controlled rAF loop.
      if (error.name === 'RRvideoReplayError')
        source.replayError ??= new Error(
          `Replay callback failed: ${error.stack || error.message}`,
        );
    });
    if (config.capture === 'compositor') {
      source.session = await context.newCDPSession(page);
      const { product } = await source.session.send('Browser.getVersion');
      if (!product.includes('HeadlessChrome'))
        throw new Error('Compositor capture requires chrome-headless-shell');
    }
    if (config.replayMode === 'incremental') {
      const epoch = events[0].timestamp;
      if (source.session) {
        const { virtualTimeTicksBase } = await source.session.send(
          'Emulation.setVirtualTimePolicy',
          { policy: 'pause', initialVirtualTime: epoch / 1000 },
        );
        source.frameTimeBase = virtualTimeTicksBase + 1;
        await page.evaluate(() => {
          // rrweb subtracts performance.now() values to accumulate replay time.
          // Native fractional values can put an exact event boundary just below
          // its timestamp. The paused virtual Date clock has integer precision.
          const epoch = Date.now();
          Object.defineProperty(performance, 'now', {
            value: () => Date.now() - epoch,
          });
          const requestFrame = window.requestAnimationFrame.bind(window);
          window.requestAnimationFrame = (callback) =>
            requestFrame((timestamp) => {
              try {
                callback(timestamp);
              } catch (error) {
                // Wrap instead of mutating: DOMException names can be readonly,
                // and callbacks may throw frozen errors or primitives.
                let diagnostic = 'Replay callback threw an unreadable value';
                try {
                  diagnostic =
                    error instanceof Error
                      ? error.stack || `${error.name}: ${error.message}`
                      : String(error);
                } catch {
                  // Even values without a string representation must be tagged.
                }
                const failure = new Error(diagnostic);
                failure.name = 'RRvideoReplayError';
                throw failure;
              }
            });
        });
      } else {
        await page.clock.install({ time: epoch });
        await page.clock.pauseAt(epoch + 1000);
      }
      if (!source.session)
        await page.evaluate(() => {
          // Playwright runs rAF on a 16ms cadence. Replay must instead flush at
          // each requested output timestamp, including when capturing above 60fps.
          const callbacks = new Map<number, FrameRequestCallback>();
          let nextId = 0;
          window.requestAnimationFrame = (callback) => {
            callbacks.set(++nextId, callback);
            return nextId;
          };
          window.cancelAnimationFrame = (id) => {
            callbacks.delete(id);
          };
          (window as unknown as ReplayWindow).__rrvideoAdvanceFrame = () => {
            for (const id of Array.from(callbacks.keys())) {
              const callback = callbacks.get(id);
              callbacks.delete(id);
              callback?.(performance.now());
            }
          };
        });
    }
    await page.setContent(
      getHtml(events, config, { scale: 1, startPlayback: false }),
      { waitUntil: 'load' },
    );
    const initError = await page.evaluate(
      () => (window as unknown as ReplayWindow).__rrvideoInitError,
    );
    if (initError)
      throw new Error(`Failed to initialize rrweb-player: ${initError}`);
    if (config.replayMode === 'incremental') {
      // Finish the player's mount/resize before starting replay's clock.
      await source.advanceTime(1);
      await page.evaluate(() =>
        (window as unknown as ReplayWindow).replayer.getReplayer().play(0),
      );
    } else {
      await page.evaluate(
        () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
      );
    }
    source.throwIfReplayFailed();
    return source;
  }

  private throwIfReplayFailed(): void {
    if (this.replayError) throw this.replayError;
  }

  async finish(): Promise<void> {
    // Flush Playwright's page session before publishing the final frame. CDP
    // beginFrame uses a separate session, so its reply need not follow pageerror.
    await this.page.evaluate(() => 0);
    this.throwIfReplayFailed();
  }

  private async advanceTime(milliseconds: number): Promise<void> {
    const session = this.session;
    if (!session) return this.page.clock.runFor(milliseconds);
    // Native virtual time also pauses CSS/document timelines. beginFrame alone
    // schedules drawing but does not stop those timelines between captures.
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        session.off('Emulation.virtualTimeBudgetExpired', expired);
        this.page.off('close', closed);
      };
      const expired = () => {
        cleanup();
        resolve();
      };
      const failed = (error: Error) => {
        cleanup();
        reject(error);
      };
      const closed = () =>
        failed(new Error('Capture page closed while advancing virtual time'));
      const timer = setTimeout(
        () => failed(new Error('Browser virtual time advance timed out')),
        this.config.captureTimeoutMs,
      );
      session.once('Emulation.virtualTimeBudgetExpired', expired);
      this.page.once('close', closed);
      void session
        .send('Emulation.setVirtualTimePolicy', {
          policy: 'advance',
          budget: milliseconds,
          maxVirtualTimeTaskStarvationCount: 1000,
        })
        .catch(failed);
    });
  }

  async frame(index: number): Promise<Buffer> {
    const deadline = Date.now() + this.config.captureTimeoutMs;
    this.throwIfReplayFailed();
    // Use the recording's millisecond precision. Fractional targets expose
    // Chromium's per-context timer quantization in both CSS and replay rAF.
    const time = Math.floor((index * 1000) / this.config.fps);
    if (this.config.replayMode === 'seek') {
      await this.page.evaluate(
        (offset) =>
          (window as unknown as ReplayWindow).replayer.goto(offset, false),
        ((index * 1000) / this.config.fps) *
          (this.config.rrwebPlayer.speed ?? 1),
      );
    } else if (time > this.previousTime) {
      await this.advanceTime(time - this.previousTime);
    }
    if (this.config.replayMode === 'incremental' && !this.session) {
      await this.page.evaluate(() =>
        (window as unknown as ReplayWindow).__rrvideoAdvanceFrame(),
      );
    }
    this.previousTime = time;
    if (this.config.frameDelayMs)
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.frameDelayMs),
      );
    if (this.session) {
      const nextFrameTick =
        this.frameTimeBase + Math.floor(((index + 1) * 1000) / this.config.fps);
      for (let attempt = 0; attempt < 10; attempt++) {
        // Chrome hangs on repeated ticks. Keep replay's virtual clock paused;
        // only retry drawing, at most 9 microseconds beyond the nominal target.
        // The next frame always returns to its original absolute timestamp.
        // Encode inside the microsecond interval so floating-point rounding
        // cannot collapse a supposedly later retry onto the previous tick.
        const tick = compositorFrameTick(this.frameTimeBase, time, attempt);
        if (Date.now() >= deadline)
          throw new Error(`Compositor request timed out for frame ${index}`);
        if (tick >= nextFrameTick) break;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const result = await Promise.race([
          this.session.send('HeadlessExperimental.beginFrame', {
            frameTimeTicks: tick,
            interval: 1000 / this.config.fps,
            screenshot: { format: 'jpeg', quality: this.config.quality },
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  new Error(`Compositor request timed out for frame ${index}`),
                ),
              Math.max(0, deadline - Date.now()),
            );
          }),
        ]).finally(() => clearTimeout(timer));
        this.throwIfReplayFailed();
        if (result.screenshotData)
          return Buffer.from(result.screenshotData, 'base64');
        // Give a transiently missing surface time to commit before retrying.
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      throw new Error(
        `Compositor returned no screenshot for frame ${index} within the retry limit`,
      );
    }
    const screenshot = await this.page.screenshot({
      type: 'jpeg',
      quality: this.config.quality,
      timeout: this.config.captureTimeoutMs,
    });
    this.throwIfReplayFailed();
    return screenshot;
  }
}
