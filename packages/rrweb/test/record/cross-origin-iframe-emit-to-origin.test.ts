import * as path from 'path';
import type * as http from 'http';
import type * as puppeteer from 'puppeteer';
import { EventType } from '@rrweb/types';
import { getServerURL, launchPuppeteer, startServer } from '../utils';

interface RecordingWindow extends Window {
  rrweb: Pick<typeof import('../../src'), 'record' | 'addCustomEvent'>;
}

describe('emitToOrigin', () => {
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
    await page.evaluate(() => {
      const messages: MessageEvent['data'][] = [];
      const completed = document.createElement('div');
      completed.id = 'completed';
      document.body.appendChild(completed);
      window.addEventListener('message', (event) => {
        if (event.data === 'test-complete') {
          completed.textContent = JSON.stringify(messages);
        } else if (event.data?.type === 'rrweb') {
          messages.push(event.data.event);
        }
      });
    });
    const childURL = `${getServerURL(childServer)}/html/blank.html`;
    await page.evaluate(async (src) => {
      await new Promise<void>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.onload = () => resolve();
        iframe.src = src;
        document.body.appendChild(iframe);
      });
    }, childURL);
  });

  afterEach(async () => {
    await page.close();
  });

  it.each([
    {
      origin: '*',
      delivered: true,
      description: 'allows any parent with a wildcard',
    },
    {
      origin: 'matching',
      delivered: true,
      description: 'allows a matching parent origin',
    },
    {
      origin: 'https://untrusted.example',
      delivered: false,
      description: 'blocks a different parent origin',
    },
  ])('$description', async ({ origin, delivered }) => {
    const frame = page.mainFrame().childFrames()[0];
    await frame.addScriptTag({
      path: path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
    });
    await frame.evaluate(
      (emitToOrigin) => {
        const { record, addCustomEvent } = (window as RecordingWindow).rrweb;
        const stop = record({ emitToOrigin });
        addCustomEvent('emit-to-origin-test', {});
        stop?.();
        window.parent.postMessage('test-complete', '*');
      },
      origin === 'matching' ? getServerURL(parentServer) : origin,
    );
    await page.waitForFunction(
      () => document.querySelector('#completed')?.textContent,
    );
    const messages = JSON.parse(
      await page.$eval('#completed', (element) => element.textContent!),
    );
    if (delivered) {
      expect(messages).toContainEqual({
        type: EventType.Custom,
        data: { tag: 'emit-to-origin-test', payload: {} },
        timestamp: expect.any(Number),
      });
    } else {
      expect(messages).toEqual([]);
    }
  });
});
