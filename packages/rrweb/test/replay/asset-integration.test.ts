import * as fs from 'fs';
import * as path from 'path';
import { launchPuppeteer, waitForRAF } from '../utils';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import type * as puppeteer from 'puppeteer';
import events from '../events/assets';
import mutationEvents from '../events/assets-mutation';
import { vi } from 'vitest';

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

expect.extend({ toMatchImageSnapshot });

describe('replayer', function () {
  vi.setConfig({ testTimeout: 10_000 });

  let code: ISuite['code'];
  let browser: ISuite['browser'];
  let page: ISuite['page'];

  beforeAll(async () => {
    browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.cjs');
    code = fs.readFileSync(bundlePath, 'utf8');
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    // mouse cursor canvas is large and pushes the replayer below the fold
    // lets hide it...
    await page.addStyleTag({
      content: '.replayer-mouse-tail{display: none !important;}',
    });
    await page.evaluate(code);
    await page.evaluate(`let events = ${JSON.stringify(events)}`);
    await page.evaluate(`let events2 = ${JSON.stringify(mutationEvents)}`);

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('asset', () => {
    it('should incorporate assets emitted later', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, {
      });
      replayer.pause(0);
    `);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it('should incorporate assets streamed later', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events[0]);
      window.replayer.addEvent(events[1]);
    `);

      await waitForRAF(page);

      await page.evaluate(`
        window.replayer.addEvent(events[2]);
      `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it('should support urls src modified via incremental mutation', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive();
      window.replayer.addEvent(events2[0]);
      window.replayer.addEvent(events2[1]);
      window.replayer.addEvent(events2[2]);
    `);

      await waitForRAF(page);

      await page.evaluate(`
        window.replayer.addEvent(events2[3]);
      `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    test.todo('should support video elements');
    test.todo('should support audio elements');
    test.todo('should support embed elements');
    test.todo('should support source elements');
    test.todo('should support track elements');
    test.todo('should support input#type=image elements');
    test.todo('should support img srcset');
  });
});
