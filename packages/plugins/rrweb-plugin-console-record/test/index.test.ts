import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import { stringifySnapshots } from '../../../rrweb/test/utils';
import { createServer, ViteDevServer } from 'vite';
import * as puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import type { eventWithTime } from '@saola.ai/rrweb-types';

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
  // vi.setConfig({ testTimeout: 120_000 });
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

  it('should handle recursive console messages', async () => {
    await page.goto(`${serverUrl}test/html/log.html`);

    await page.evaluate(() => {
      // Some frameworks like Vue.js use proxies to implement reactivity.
      // This can cause infinite loops when logging objects.
      let recursiveTarget = { foo: 'bar', proxied: 'i-am', proxy: null };
      let count = 0;

      const handler = {
        get(target: any, prop: any, ...args: any[]) {
          if (prop === 'proxied') {
            if (count > 9) {
              return;
            }
            count++; // We don't want out test to get into an infinite loop...
            console.warn(
              'proxied was accessed so triggering a console.warn',
              target,
            );
          }
          return Reflect.get(target, prop, ...args);
        },
      };

      const proxy = new Proxy(recursiveTarget, handler);
      recursiveTarget.proxy = proxy;

      console.log('Proxied object:', proxy);
    });

    // await waitForRAF(page);

    const snapshots = (await page.evaluate(
      'window.snapshots',
    )) as eventWithTime[];
    // The snapshots should containe 1 console log, not multiple.
    await assertSnapshot(snapshots);
  });

  it('should record console messages', async () => {
    await page.goto(`${serverUrl}test/html/log.html`);

    await page.evaluate(() => {
      // truthy assert does not log
      console.assert(0 === 0, 'should not log assert');
      // falsy assert does log
      console.assert(false, 'should log assert');
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
    await assertSnapshot(snapshots);
  });
});
