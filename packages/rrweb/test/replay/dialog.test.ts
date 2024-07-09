import * as fs from 'fs';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import * as path from 'path';
import { vi } from 'vitest';

import dialogPlaybackEvents, {
  closedFullSnapshotTime,
  showIncrementalAttributeTime,
  closeIncrementalAttributeTime,
  showModalIncrementalAttributeTime,
  showFullSnapshotTime,
  showModalFullSnapshotTime,
  showModalIncrementalAddTime,
  switchBetweenShowModalAndShowIncrementalAttributeTime,
  switchBetweenShowAndShowModalIncrementalAttributeTime,
} from '../events/dialog-playback';
import {
  fakeGoto,
  getServerURL,
  hideMouseAnimation,
  ISuite,
  launchPuppeteer,
  startServer,
  waitForRAF,
} from '../utils';

expect.extend({ toMatchImageSnapshot });

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
    page.on('console', (msg) => {
      console.log(msg.text());
    });

    await fakeGoto(page, `${serverURL}/html/dialog.html`);
    await page.evaluate(code);
    await waitForRAF(page);
    await hideMouseAnimation(page);
  });

  [
    {
      name: 'show the dialog when open attribute gets added',
      time: showIncrementalAttributeTime,
    },
    {
      name: 'should close dialog again when open attribute gets removed',
      time: closeIncrementalAttributeTime,
    },
    {
      name: 'should open dialog with showModal',
      time: showModalIncrementalAttributeTime,
    },
    {
      name: 'should switch between showModal and show',
      time: switchBetweenShowModalAndShowIncrementalAttributeTime,
    },
    {
      name: 'should switch between show and showModal',
      time: switchBetweenShowAndShowModalIncrementalAttributeTime,
    },
    {
      name: 'should open dialog with show in full snapshot',
      time: showFullSnapshotTime,
    },
    {
      name: 'should open dialog with showModal in full snapshot',
      time: showModalFullSnapshotTime,
    },
    {
      name: 'should add an opened dialog with showModal in incremental snapshot',
      time: showModalIncrementalAddTime,
    },
    {
      name: 'should add an opened dialog with showModal in incremental snapshot alternative',
      time: [showModalFullSnapshotTime, showModalIncrementalAddTime],
    },
  ].forEach(({ name, time }) => {
    [true, false].forEach((useVirtualDom) => {
      it(`${name} (virtual dom: ${useVirtualDom})`, async () => {
        await page.evaluate(
          `let events = ${JSON.stringify(dialogPlaybackEvents)}`,
        );
        await page.evaluate(`
          const { Replayer } = rrweb;
          window.replayer = new Replayer(events, { useVirtualDom: ${useVirtualDom} });
        `);
        const timeArray = Array.isArray(time) ? time : [time];
        for (let i = 0; i < timeArray.length; i++) {
          await page.evaluate(`
            window.replayer.pause(${timeArray[i]});
          `);
          await waitForRAF(page);
        }

        const frameImage = await page!.screenshot({
          fullPage: false,
        });
        const defaultImageFilePrefix =
          'dialog-test-ts-test-replay-dialog-test-ts-dialog';
        const kebabCaseName = name
          .replace(/ /g, '-')
          .replace(/showModal/g, 'show-modal');
        const imageFileName = `${defaultImageFilePrefix}-${kebabCaseName}`;
        expect(frameImage).toMatchImageSnapshot({
          customSnapshotIdentifier: imageFileName,
          failureThreshold: 0.05,
          failureThresholdType: 'percent',
          dumpDiffToConsole: true,
          storeReceivedOnFailure: true,
        });
      });
    });
  });

  it('closed dialogs show nothing', async () => {
    await page.evaluate(`let events = ${JSON.stringify(dialogPlaybackEvents)}`);
    await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(events);
    `);
    await waitForRAF(page);

    const frameImage = await page!.screenshot();
    expect(frameImage).toMatchImageSnapshot({
      failureThreshold: 0.05,
      failureThresholdType: 'percent',
    });
  });

  // TODO: implement me in the future
  it.skip('should trigger showModal on multiple dialogs in a specific order');
});
