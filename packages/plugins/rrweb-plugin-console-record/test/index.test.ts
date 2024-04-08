import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { stringifySnapshots } from '../../../rrweb/test/utils';
import { createServer, ViteDevServer } from 'vite';
import * as puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import type { eventWithTime } from '@rrweb/types';

export async function launchPuppeteer(
  options?: Parameters<(typeof puppeteer)['launch']>[0],
) {
  return await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS ? true : false,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    args: ['--no-sandbox'],
    ...options,
  });
}

export function assertSnapshot(snapshots: eventWithTime[]) {
  expect(snapshots).toBeDefined();
  expect(stringifySnapshots(snapshots)).toMatchSnapshot();
}

describe('rrweb-plugin-console-record', () => {
  let server: ViteDevServer;
  let serverUrl: string;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    server = await createServer({
      preview: { port: 3000 },
      mode: 'test',
      // hmr calls `console.debug('[vite] connected')` and messes up our snapshots
      // so we disable it
      server: { hmr: false },
    });
    await server.listen();
    serverUrl = server.resolvedUrls!.local[0];
    browser = await launchPuppeteer();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  it('should record console messages', async () => {
    await page.goto(`${serverUrl}test/html/log.html`);

    await page.evaluate(() => {
      console.assert(0 === 0, 'assert');
      console.count('count');
      console.countReset('count');
      console.debug('debug');
      console.dir('dir');
      console.dirxml('dirxml');
      console.group();
      console.groupCollapsed();
      console.info('info');
      console.log('log');
      console.table('table');
      console.time();
      console.timeEnd();
      console.timeLog();
      console.trace('trace');
      console.warn('warn');
      console.clear();
      console.log(new TypeError('a message'));
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
    });

    await page.frames()[1].evaluate(() => {
      console.log('from iframe');
    });

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    assertSnapshot(snapshots);
  });
});
