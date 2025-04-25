import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';
import { launchPuppeteer } from '../utils';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import type * as puppeteer from 'puppeteer';
import events from '../events/webgl';

interface ISuite {
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

expect.extend({ toMatchImageSnapshot });

describe('replayer', function () {
  vi.setConfig({ testTimeout: 10_000 });

  let browser: ISuite['browser'];
  let page: ISuite['page'];

  beforeAll(async () => {
    browser = await launchPuppeteer();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    // mouse cursor canvas is large and pushes the replayer below the fold
    // lets hide it...
    await page.addStyleTag({
      content: '.replayer-mouse-tail{display: none !important;}',
    });
    await page.addScriptTag({
      path: path.resolve(__dirname, '../../dist/rrweb.umd.js'),
    });
    await page.evaluate(`let events = ${JSON.stringify(events)}`);

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('webgl', () => {
    it('should output simple webgl object', async () => {
      await page.evaluate(`
      const { Replayer } = rrweb;
      const replayer = new Replayer(events, {
        UNSAFE_replayCanvas: true,
      });
      replayer.play(2500);
    `);

      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot();
    });
  });
});
