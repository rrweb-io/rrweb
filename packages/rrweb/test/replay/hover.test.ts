import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';
import { launchPuppeteer, waitForRAF } from '../utils';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import type * as puppeteer from 'puppeteer';
import events from '../events/hover';

interface ISuite {
  code: string;
  styles: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

expect.extend({ toMatchImageSnapshot });

describe('replayer', function () {
  // Increase timeouts – the hover test occasionally hits the 20s default
  // in CI when the first couple of animation frames are delayed.
  vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

  let code: ISuite['code'];
  let styles: ISuite['styles'];
  let browser: ISuite['browser'];
  let page: ISuite['page'];

  beforeAll(async () => {
    // Use standard headless launch (no devtools) to reduce flakiness & speed up in CI
    browser = await launchPuppeteer();

    const bundlePath = path.resolve(__dirname, '../../dist/rrweb.umd.cjs');
    const stylePath = path.resolve(
      __dirname,
      '../../src/replay/styles/style.css',
    );
    code = fs.readFileSync(bundlePath, 'utf8');
    styles = fs.readFileSync(stylePath, 'utf8');
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.addStyleTag({
      content: styles,
    });
    await page.evaluate(code);
    await page.evaluate(`let events = ${JSON.stringify(events)}`);

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('hover', () => {
    it('should trigger hover on mouseDown', async () => {
      await page.evaluate(`
        const { Replayer } = rrweb;
        window.replayer = new Replayer(events, { speed: 1 });
        // Pause slightly after the mouseDown timestamp to fast-forward to that interaction
        window.replayer.pause(110);
      `);

      // Wait until the synthetic :hover class has been applied inside the replayer iframe
      await page.waitForFunction(
        () =>
          !!document
            .querySelector('iframe')
            ?.contentDocument?.querySelector('.\\:hover'),
        { timeout: 5000 },
      );

      // A couple of RAFs to settle layout/paint before screenshot
      await waitForRAF(page);
      await waitForRAF(page);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        failureThreshold: 40,
      });
    });
  });
});
