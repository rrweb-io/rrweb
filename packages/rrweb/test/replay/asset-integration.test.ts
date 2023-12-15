import * as fs from 'fs';
import * as path from 'path';
import { launchPuppeteer, waitForRAF } from '../utils';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import type * as puppeteer from 'puppeteer';
import events from '../events/assets';
import mutationEvents from '../events/assets-mutation';
import assetsChangedEvents from '../events/assets-src-changed-before-asset-loaded';
import type { assetEvent } from '@rrweb/types';
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
    await page.evaluate(
      `let mutationEvents = ${JSON.stringify(mutationEvents)}`,
    );
    await page.evaluate(
      `let assetsChangedEvents = ${JSON.stringify(assetsChangedEvents)}`,
    );

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

      await waitForRAF(page);

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
      replayer.startLive(mutationEvents[0].timestamp);
      window.replayer.addEvent(mutationEvents[0]);
      window.replayer.addEvent(mutationEvents[1]);
      window.replayer.addEvent(mutationEvents[2]);
    `);

      await waitForRAF(page);

      await page.evaluate(`
        window.replayer.addEvent(mutationEvents[3]);
      `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it("on mutation should add bogus src attribute until the asset is loaded so chrome doesn't display broken image icon", async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive(mutationEvents[0].timestamp);
      window.replayer.addEvent(mutationEvents[0]);
      window.replayer.addEvent(mutationEvents[1]);
      window.replayer.addEvent(mutationEvents[2]);
    `);

      await waitForRAF(page);

      const loadingImage = await page.screenshot();
      expect(loadingImage).toMatchImageSnapshot({
        customSnapshotIdentifier: 'asset-integration-test-ts-loading',
        failureThreshold: 0.02,
        failureThresholdType: 'percent',
      });

      expect(
        await page.evaluate(
          `document.querySelector('iframe').contentDocument.querySelector('img').getAttribute('src')`,
        ),
      ).toBe('//:0');

      await page.evaluate(`
        window.replayer.addEvent(mutationEvents[3]);
      `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it('should wait with adding src attribute until the asset is loaded 2', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive(events[0].timestamp);
      window.replayer.addEvent(events[0]);
      window.replayer.addEvent(events[1]);
    `);

      await waitForRAF(page);

      expect(
        await page.evaluate(
          `document.querySelector('iframe').contentDocument.querySelector('img').getAttribute('src')`,
        ),
      ).toBe('//:0');

      await page.evaluate(`
        window.replayer.addEvent(events[2]);
      `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 0.02,
        failureThresholdType: 'percent',
      });
    });

    it('should show the correct asset when assets are loading while src is changed in live mode', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([], {
        liveMode: true,
      });
      replayer.startLive(assetsChangedEvents[0].timestamp);
      window.replayer.addEvent(assetsChangedEvents[0]);
      window.replayer.addEvent(assetsChangedEvents[1]);
      window.replayer.addEvent(assetsChangedEvents[2]);
      window.replayer.addEvent(assetsChangedEvents[3]);
      window.replayer.addEvent(assetsChangedEvents[4]);
    `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 0.04,
        failureThresholdType: 'percent',
      });
    });

    it('should show the loaded asset (robot) in non-live mode', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(assetsChangedEvents);
      console.log('pausing at', (assetsChangedEvents[2].timestamp - assetsChangedEvents[0].timestamp) + 1)
      replayer.pause((assetsChangedEvents[2].timestamp - assetsChangedEvents[0].timestamp) + 1);
    `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 0.04,
        failureThresholdType: 'percent',
      });
    });

    it('should show the loaded asset (red square) in non-live mode', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer(assetsChangedEvents);
      console.log('pausing at', (assetsChangedEvents[1].timestamp - assetsChangedEvents[0].timestamp) + 1)
      replayer.pause((assetsChangedEvents[1].timestamp - assetsChangedEvents[0].timestamp) + 1);
  `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });

    it('should list original url in non-live mode when asset never gets loaded', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([assetsChangedEvents[0], assetsChangedEvents[1]]);
      replayer.pause(assetsChangedEvents[1].timestamp);
    `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 30,
      });
    });

    it('should list original url in non-live mode when asset fails to load', async () => {
      const failedEvent: assetEvent & { timestamp: number } = {
        type: 7,
        data: {
          url: 'ftp://example.com/red.png',
          failed: {
            status: 404,
            message: 'Not Found',
          },
        },
        timestamp: assetsChangedEvents[2].timestamp,
      };
      await page.evaluate(`
      const { Replayer } = rrweb;
      window.replayer = new Replayer([assetsChangedEvents[0], assetsChangedEvents[1], ${JSON.stringify(
        failedEvent,
      )}]);
      replayer.pause(assetsChangedEvents[1].timestamp);
    `);

      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 30,
      });

      expect(
        await page.evaluate(
          `document.querySelector('iframe').contentDocument.querySelector('img').getAttribute('src')`,
        ),
      ).toMatchInlineSnapshot(`"ftp://example.com/red.png"`);
    });
  });
});
