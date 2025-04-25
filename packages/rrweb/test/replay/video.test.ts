import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import {
  startServer,
  launchPuppeteer,
  getServerURL,
  waitForRAF,
  ISuite,
  hideMouseAnimation,
  fakeGoto,
} from '../utils';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { vi } from 'vitest';
import { Replayer } from '../../src/replay';
import videoPlaybackEvents from '../events/video-playback';
import videoPlaybackOnFullSnapshotEvents from '../events/video-playback-on-full-snapshot';
expect.extend({ toMatchImageSnapshot });

type IWindow = typeof globalThis & Window & { replayer: Replayer };

async function waitForVideoTo(triggerEventType: string, page: puppeteer.Page) {
  await waitForRAF(page);
  await page.evaluate(
    (triggerEventType) =>
      new Promise((resolve) => {
        document
          .querySelector('iframe')
          ?.contentDocument?.querySelector('video')
          ?.addEventListener(triggerEventType, resolve);
      }),
    triggerEventType,
  );
  await waitForRAF(page);
}

describe('video', () => {
  vi.setConfig({ testTimeout: 100_000 });
  let code: ISuite['code'];
  let page: ISuite['page'];
  let browser: ISuite['browser'];
  let server: ISuite['server'];
  let serverURL: ISuite['serverURL'];

  beforeAll(async () => {
    server = await startServer();
    serverURL = getServerURL(server);
    browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.js');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await server.close();
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();

    await fakeGoto(page, `${serverURL}/html/video.html`);
    await page.evaluate(code);
    await waitForRAF(page);
    await hideMouseAnimation(page);
  });

  it('will seek to the correct moment', async () => {
    await page.evaluate(`let events = ${JSON.stringify(videoPlaybackEvents)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events);
    `);
    const wait = waitForVideoTo('seeked', page);
    // seek replayer to 6.5s
    await page.evaluate('window.replayer.pause(6500)');
    // wait till video is done seeking
    await wait;

    const frameImage = await page!.screenshot();
    await waitForRAF(page);
    expect(frameImage).toMatchImageSnapshot({
      failureThreshold: 0.05,
      failureThresholdType: 'percent',
    });
  });

  it('will seek to the correct moment without media interaction events', async () => {
    await page.evaluate(`
      let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)};
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events);
    `);

    const wait = waitForVideoTo('seeked', page);
    // seek replayer to 6.5s
    await page.evaluate('window.replayer.pause(6500)');
    // wait till video is done seeking
    await wait;

    const frameImage = await page!.screenshot();
    await waitForRAF(page);
    expect(frameImage).toMatchImageSnapshot({
      failureThreshold: 0.05,
      failureThresholdType: 'percent',
    });
  });

  it("will be paused when the player wasn't started yet", async () => {
    await page.evaluate(`
      let events = ${JSON.stringify(videoPlaybackEvents)};
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events);
    `);
    await waitForVideoTo('canplaythrough', page);

    // loading indicator lingers quite often
    await page.waitForTimeout(1000);

    const frameImage = await page!.screenshot();

    await waitForRAF(page);
    expect(frameImage).toMatchImageSnapshot({
      failureThreshold: 0.05,
      failureThresholdType: 'percent',
    });
  });

  it('will play from the correct moment', async () => {
    await page.evaluate(`let events = ${JSON.stringify(videoPlaybackEvents)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events, {
        UNSAFE_replayCanvas: true,
      });
    `);
    await waitForRAF(page);
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          document
            .querySelector('iframe')
            ?.contentDocument?.querySelector('video')
            ?.addEventListener('playing', resolve);
          // play replayer at 6.5s
          (window as IWindow).replayer.play(6500);
        }),
    );
    await waitForRAF(page);

    const frameImage = await page!.screenshot();
    await waitForRAF(page);
    expect(frameImage).toMatchImageSnapshot({
      failureThreshold: 0.05,
      failureThresholdType: 'percent',
    });

    // TODO: check to see if video is same as basic replay
  });

  it('should play from the start', async () => {
    await page.evaluate(`let events = ${JSON.stringify(videoPlaybackEvents)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events);
    `);
    const waitForPlaying = waitForVideoTo('playing', page);
    await page.evaluate(`window.replayer.play()`);
    await waitForPlaying;

    const isPlaying = await page.evaluate(`
      !document.querySelector('iframe').contentDocument.querySelector('video').paused && 
      document.querySelector('iframe').contentDocument.querySelector('video').currentTime !== 0 && 
      !document.querySelector('iframe').contentDocument.querySelector('video').ended;
    `);
    expect(isPlaying).toBe(true);
  });

  it('should play from the start without media events', async () => {
    await page.evaluate(
      `let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)}`,
    );
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events);
    `);

    const waitForPlaying = waitForVideoTo('playing', page);
    await page.evaluate(`window.replayer.play()`);
    await waitForPlaying;

    const isPlaying = await page.evaluate(`
      !document.querySelector('iframe').contentDocument.querySelector('video').paused && 
      document.querySelector('iframe').contentDocument.querySelector('video').currentTime !== 0 && 
      !document.querySelector('iframe').contentDocument.querySelector('video').ended;
    `);
    expect(isPlaying).toBe(true);
  });

  it('should report the correct time for looping videos that have passed their total time', async () => {
    await page.evaluate(
      `let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)}`,
    );
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events);
    `);

    const waitForSeek = waitForVideoTo('seeked', page);
    await page.evaluate(`window.replayer.pause(25000);`); // 5 seconds after the video started a new loop
    await waitForSeek;

    const time = await page.evaluate(`
      document.querySelector('iframe').contentDocument.querySelector('video').currentTime;
    `);
    expect(time).toBeCloseTo(5, 0);
  });

  it('should set the correct time on loading videos', async () => {
    await page.evaluate(
      `let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)}`,
    );
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events);
    `);

    const waitForSeek = waitForVideoTo('seeked', page);
    await page.evaluate(`window.replayer.pause(25000);`); // 5 seconds after the video started a new loop
    await waitForSeek;

    const time = await page.evaluate(`
      document.querySelector('iframe').contentDocument.querySelector('video').currentTime;
    `);
    expect(time).toBeCloseTo(5, 0);
  });

  it('should set the correct playbackRate on faster playback', async () => {
    page.on('console', (msg) => {
      console.log(msg.text());
    });
    await page.evaluate(
      `let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)}`,
    );
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events, {
        speed: 8,
      });
    `);

    const waitForPlaying = waitForVideoTo('playing', page);
    await page.evaluate(`window.replayer.play()`);
    await waitForPlaying;

    const time = await page.evaluate(`
      document.querySelector('iframe').contentDocument.querySelector('video').playbackRate;
    `);
    expect(time).toBe(8);
  });
});
