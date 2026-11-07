import * as path from 'path';
import type * as http from 'http';
import type * as puppeteer from 'puppeteer';
import { EventType } from '@rrweb/types';
import { getServerURL, launchPuppeteer, startServer } from '../utils';

interface RecordingWindow extends Window {
  rrweb: Pick<typeof import('../../src'), 'record' | 'addCustomEvent'>;
  __collected: { type: number; data?: unknown }[];
}

describe('collectFromOrigins', () => {
  let browser: puppeteer.Browser;
  let parentServer: http.Server;
  let childServer: http.Server;
  let page: puppeteer.Page;

  beforeAll(async () => {
    browser = await launchPuppeteer();
    parentServer = await startServer(0);
    childServer = await startServer(0);
  });

  afterAll(async () => {
    await browser.close();
    parentServer.close();
    childServer.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(`${getServerURL(parentServer)}/html/blank.html`);
    const childURL = `${getServerURL(childServer)}/html/blank.html`;
    await page.evaluate(async (src) => {
      await new Promise<void>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.onload = () => resolve();
        iframe.src = src;
        document.body.appendChild(iframe);
      });
    }, childURL);
    await page.addScriptTag({
      path: path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
    });
    const frame = page.mainFrame().childFrames()[0];
    await frame.addScriptTag({
      path: path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
    });
  });

  afterEach(async () => {
    await page.close();
  });

  it.each([
    {
      allow: 'child',
      collected: true,
      description: 'collects from an allowed child origin',
    },
    {
      allow: '*',
      collected: true,
      description: 'collects from any origin with a wildcard',
    },
    {
      allow: 'https://untrusted.example',
      collected: false,
      description: 'drops events from a child origin not in the list',
    },
  ])('$description', async ({ allow, collected }) => {
    const childOrigin = new URL(getServerURL(childServer)).origin;
    await page.evaluate(
      (collectFromOrigin) => {
        const w = window as unknown as RecordingWindow;
        w.__collected = [];
        const completed = document.createElement('div');
        completed.id = 'completed';
        document.body.appendChild(completed);
        window.addEventListener('message', (event) => {
          if (event.data === 'child-complete') {
            completed.textContent = JSON.stringify(w.__collected);
          }
        });
        w.rrweb.record({
          collectFromOrigins: [collectFromOrigin],
          emit(event) {
            w.__collected.push(event);
          },
        });
      },
      allow === 'child' ? childOrigin : allow,
    );
    await page.waitForFunction(
      (fullSnapshotType) =>
        (window as unknown as RecordingWindow).__collected?.some(
          (e) => e.type === fullSnapshotType,
        ),
      {},
      EventType.FullSnapshot,
    );

    const parentOrigin = new URL(getServerURL(parentServer)).origin;
    const frame = page.mainFrame().childFrames()[0];
    await frame.evaluate((emitToOrigin) => {
      const { record, addCustomEvent } = (window as RecordingWindow).rrweb;
      const stop = record({ emitToOrigin });
      addCustomEvent('collect-from-origins-test', {});
      stop?.();
      window.parent.postMessage('child-complete', '*');
    }, parentOrigin);

    await page.waitForFunction(
      () => document.querySelector('#completed')?.textContent,
    );
    const events = JSON.parse(
      await page.$eval('#completed', (element) => element.textContent!),
    );
    const hasChildCustomEvent = events.some(
      (e: { type: number; data?: { tag?: string } }) =>
        e.type === EventType.Custom &&
        e.data?.tag === 'collect-from-origins-test',
    );
    expect(hasChildCustomEvent).toBe(collected);
  });
});
