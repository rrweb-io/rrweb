import * as fs from 'fs';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import * as path from 'path';
import { vi } from 'vitest';

import dialogPlaybackEvents from '../events/dialog-playback';
import {
  fakeGoto,
  getServerURL,
  hideMouseAnimation,
  ISuite,
  launchPuppeteer,
  startServer,
  waitForRAF,
} from '../utils';

// expect.extend({ toMatchImageSnapshot });

// TODO: test the following:
// == on record ==
// - dialog open
// - dialog close
// - dialog open and close (switching from modal to non modal and vise versa)
// - multiple dialogs open, recording order
// == on playback ==
// - dialog open
// - dialog close
// - dialog open and close (switching from modal to non modal and vise versa)
// - multiple dialogs open, playback order
// == on rrdom ==
// - that the modal modes are recorded...

describe('dialog', () => {
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

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.cjs');
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

    await fakeGoto(page, `${serverURL}/html/dialog.html`);
    await page.evaluate(code);
    await waitForRAF(page);
    await hideMouseAnimation(page);
  });

  it('will seek to the correct moment', async () => {
    await page.evaluate(`let events = ${JSON.stringify(dialogPlaybackEvents)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events);
    `);
    await waitForRAF(page);

    // await page.waitForTimeout(50_000);

    // const frameImage = await page!.screenshot();
    // expect(frameImage).toMatchImageSnapshot({
    //   failureThreshold: 0.05,
    //   failureThresholdType: 'percent',
    // });
  });

  //   it('will seek to the correct moment without media interaction events', async () => {
  //     await page.evaluate(`
  //       let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)};
  //       const { Replayer } = rrweb;
  //       window.replayer = new Replayer(events);
  //       window.replayer.pause(6500);
  //     `);

  //     await page.waitForNetworkIdle();
  //     await waitForRAF(page);

  //     const frameImage = await page!.screenshot();
  //     await waitForRAF(page);
  //     expect(frameImage).toMatchImageSnapshot({
  //       failureThreshold: 0.05,
  //       failureThresholdType: 'percent',
  //     });
  //   });

  //   it("will be paused when the player wasn't started yet", async () => {
  //     await page.evaluate(`
  //       let events = ${JSON.stringify(videoPlaybackEvents)};
  //       const { Replayer } = rrweb;
  //       window.replayer = new Replayer(events);
  //     `);
  //     await page.waitForNetworkIdle();
  //     await waitForRAF(page);

  //     const frameImage = await page!.screenshot();

  //     await waitForRAF(page);
  //     expect(frameImage).toMatchImageSnapshot({
  //       failureThreshold: 0.05,
  //       failureThresholdType: 'percent',
  //     });
  //   });

  //   it('will play from the correct moment', async () => {
  //     await page.evaluate(`let events = ${JSON.stringify(videoPlaybackEvents)}`);
  //     await page.evaluate(`
  //       const { Replayer } = rrweb;
  //       window.replayer = new Replayer(events, {
  //         UNSAFE_replayCanvas: true,
  //       });
  //     `);
  //     await waitForRAF(page);
  //     await page.evaluate(`
  //       window.replayer.play(6500);
  //     `);
  //     await page.waitForNetworkIdle();
  //     await waitForRAF(page);

  //     const frameImage = await page!.screenshot();
  //     await waitForRAF(page);
  //     expect(frameImage).toMatchImageSnapshot({
  //       failureThreshold: 0.05,
  //       failureThresholdType: 'percent',
  //     });

  //     // TODO: check to see if video is same as basic replay
  //   });

  //   it('should play from the start', async () => {
  //     await page.evaluate(`let events = ${JSON.stringify(videoPlaybackEvents)}`);
  //     await page.evaluate(`
  //       const { Replayer } = rrweb;
  //       window.replayer = new Replayer(events);
  //       window.replayer.play();
  //     `);
  //     await waitForRAF(page);
  //     await page.waitForNetworkIdle();
  //     await waitForRAF(page);

  //     const isPlaying = await page.evaluate(`
  //       !document.querySelector('iframe').contentDocument.querySelector('video').paused &&
  //       document.querySelector('iframe').contentDocument.querySelector('video').currentTime !== 0 &&
  //       !document.querySelector('iframe').contentDocument.querySelector('video').ended;
  //     `);
  //     expect(isPlaying).toBe(true);
  //   });

  //   it('should play from the start without media events', async () => {
  //     await page.evaluate(
  //       `let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)}`,
  //     );
  //     await page.evaluate(`
  //       const { Replayer } = rrweb;
  //       window.replayer = new Replayer(events);
  //       window.replayer.play();
  //     `);
  //     await waitForRAF(page);
  //     await page.waitForNetworkIdle();
  //     await waitForRAF(page);

  //     const isPlaying = await page.evaluate(`
  //       !document.querySelector('iframe').contentDocument.querySelector('video').paused &&
  //       document.querySelector('iframe').contentDocument.querySelector('video').currentTime !== 0 &&
  //       !document.querySelector('iframe').contentDocument.querySelector('video').ended;
  //     `);
  //     expect(isPlaying).toBe(true);
  //   });

  //   it('should report the correct time for looping videos that have passed their total time', async () => {
  //     await page.evaluate(
  //       `let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)}`,
  //     );
  //     await page.evaluate(`
  //       const { Replayer } = rrweb;
  //       window.replayer = new Replayer(events);
  //     `);
  //     await waitForRAF(page);
  //     await page.waitForNetworkIdle();
  //     await waitForRAF(page);
  //     await page.evaluate(`
  //     window.replayer.pause(25000); // 5 seconds after the video started a new loop
  //     `);
  //     await waitForRAF(page);

  //     const time = await page.evaluate(`
  //       document.querySelector('iframe').contentDocument.querySelector('video').currentTime;
  //     `);
  //     expect(time).toBeCloseTo(5, 0);
  //   });

  //   it('should set the correct time on loading videos', async () => {
  //     await page.evaluate(
  //       `let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)}`,
  //     );
  //     await page.evaluate(`
  //       const { Replayer } = rrweb;
  //       window.replayer = new Replayer(events);
  //       window.replayer.pause(25000); // 5 seconds after the video started a new loop
  //     `);
  //     await waitForRAF(page);
  //     await page.waitForNetworkIdle();
  //     await waitForRAF(page);

  //     const time = await page.evaluate(`
  //       document.querySelector('iframe').contentDocument.querySelector('video').currentTime;
  //     `);
  //     expect(time).toBeCloseTo(5, 0);
  //   });

  //   it('should set the correct playbackRate on faster playback', async () => {
  //     page.on('console', (msg) => {
  //       console.log(msg.text());
  //     });
  //     await page.evaluate(
  //       `let events = ${JSON.stringify(videoPlaybackOnFullSnapshotEvents)}`,
  //     );
  //     await page.evaluate(`
  //       const { Replayer } = rrweb;
  //       window.replayer = new Replayer(events, {
  //         speed: 8,
  //       });
  //       window.replayer.play();
  //     `);
  //     await waitForRAF(page);
  //     await page.waitForNetworkIdle();
  //     await waitForRAF(page);

  //     const time = await page.evaluate(`
  //       document.querySelector('iframe').contentDocument.querySelector('video').playbackRate;
  //     `);
  //     expect(time).toBe(8);
  //   });
});
