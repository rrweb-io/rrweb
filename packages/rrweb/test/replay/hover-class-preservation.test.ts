import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';
import { launchPuppeteer, waitForRAF } from '../utils';
import type * as puppeteer from 'puppeteer';
import hoverDuplicateClassTokensEvents from '../events/hover-duplicate-class-tokens';

interface ISuite {
  code: string;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
}

describe('replayer', function () {
  vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });

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
    await page.evaluate(code);

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('hover with duplicate class tokens', () => {
    it('should preserve duplicate class tokens when adding :hover', async () => {
      await page.evaluate(
        `var events = ${JSON.stringify(hoverDuplicateClassTokensEvents)}`,
      );

      // Pause at 550ms — after the mouse has moved over the grid element (at 500ms).
      // The replayer should have added ":hover" to the element's class attribute.
      await page.evaluate(`
        const { Replayer } = rrweb;
        window.__replayer = new Replayer(events);
        window.__replayer.pause(550);
      `);

      await waitForRAF(page);
      await waitForRAF(page);

      const replayerIframe = await page.$('iframe');
      const contentDocument = await replayerIframe!.contentFrame()!;

      // Check the raw class attribute — it should still contain "center aligned"
      // as a substring (i.e. duplicate "aligned" tokens are preserved).
      const classAttr = await contentDocument!.evaluate(() => {
        const el = document.querySelector('.ui.grid');
        return el?.getAttribute('class') ?? '';
      });

      // The class should contain the original "center aligned" substring.
      // Before the fix, classList.add(':hover') would normalize
      // "ui middle aligned center aligned grid" to
      // "ui middle aligned center grid :hover", losing the duplicate.
      expect(classAttr).toContain('center aligned');
      expect(classAttr).toContain(':hover');

      // The CSS attribute selector should still match — verify computed style.
      const justifyContent = await contentDocument!.evaluate(() => {
        const el = document.querySelector('.ui.grid');
        return el ? getComputedStyle(el).justifyContent : '';
      });

      expect(justifyContent).toBe('center');
    });

    it('should restore original class attribute when :hover is removed', async () => {
      await page.evaluate(
        `var events = ${JSON.stringify(hoverDuplicateClassTokensEvents)}`,
      );

      // Pause at 1050ms — after the mouse moved away from the grid to body (at 1000ms).
      await page.evaluate(`
        const { Replayer } = rrweb;
        window.__replayer = new Replayer(events);
        window.__replayer.pause(1050);
      `);

      await waitForRAF(page);
      await waitForRAF(page);

      const replayerIframe = await page.$('iframe');
      const contentDocument = await replayerIframe!.contentFrame()!;

      // After hover removal, the class attribute should be exactly the original.
      const classAttr = await contentDocument!.evaluate(() => {
        const el = document.querySelector('.ui.grid');
        return el?.getAttribute('class') ?? '';
      });

      expect(classAttr).toBe('ui middle aligned center aligned grid');
      expect(classAttr).not.toContain(':hover');

      // The CSS attribute selector should still match.
      const justifyContent = await contentDocument!.evaluate(() => {
        const el = document.querySelector('.ui.grid');
        return el ? getComputedStyle(el).justifyContent : '';
      });

      expect(justifyContent).toBe('center');
    });

    it('should not break hover for elements without duplicate class tokens', async () => {
      await page.evaluate(
        `var events = ${JSON.stringify(hoverDuplicateClassTokensEvents)}`,
      );

      // Pause at 550ms — hover is on the grid element (id 16) and its
      // ancestors (body id 14, html id 3). The body has no class tokens.
      await page.evaluate(`
        const { Replayer } = rrweb;
        window.__replayer = new Replayer(events);
        window.__replayer.pause(550);
      `);

      await waitForRAF(page);
      await waitForRAF(page);

      const replayerIframe = await page.$('iframe');
      const contentDocument = await replayerIframe!.contentFrame()!;

      // Body should have :hover since it's an ancestor of the hovered element.
      const bodyClass = await contentDocument!.evaluate(() => {
        return document.body?.getAttribute('class') ?? '';
      });

      expect(bodyClass).toContain(':hover');
    });
  });
});
