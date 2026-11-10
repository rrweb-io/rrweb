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
      origin: 'matching-with-path',
      delivered: true,
      description: 'normalizes a value that includes a path to its origin',
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
      origin === 'matching'
        ? getServerURL(parentServer)
        : origin === 'matching-with-path'
        ? `${getServerURL(parentServer)}/some/path`
        : origin,
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

  it('emits locally and warns when set on the top frame', async () => {
    await page.addScriptTag({
      path: path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
    });
    const result = await page.evaluate(() => {
      const { record, addCustomEvent } = (window as RecordingWindow).rrweb;
      const events: { type: number; data: { tag?: string } }[] = [];
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args: unknown[]) =>
        warnings.push(args.map(String).join(' '));
      try {
        record({
          emitToOrigin: 'https://example.com',
          emit(event) {
            events.push(event as never);
          },
        });
        addCustomEvent('top-frame-emit', {});
      } finally {
        console.warn = originalWarn;
      }
      return {
        customTags: events.filter((e) => e.type === 5).map((e) => e.data.tag),
        warnedAboutEmitToOrigin: warnings.some((w) =>
          w.includes('emitToOrigin'),
        ),
      };
    });
    expect(result.customTags).toContain('top-frame-emit');
    expect(result.warnedAboutEmitToOrigin).toBe(true);
  });

  it('does not warn when emitToOrigin matches the top frame own origin', async () => {
    await page.addScriptTag({
      path: path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
    });
    const result = await page.evaluate(() => {
      const { record, addCustomEvent } = (window as RecordingWindow).rrweb;
      const events: { type: number; data: { tag?: string } }[] = [];
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args: unknown[]) =>
        warnings.push(args.map(String).join(' '));
      try {
        record({
          emitToOrigin: location.origin,
          emit(event) {
            events.push(event as never);
          },
        });
        addCustomEvent('top-frame-same-origin', {});
      } finally {
        console.warn = originalWarn;
      }
      return {
        customTags: events.filter((e) => e.type === 5).map((e) => e.data.tag),
        warnedAboutEmitToOrigin: warnings.some((w) =>
          w.includes('emitToOrigin'),
        ),
      };
    });
    expect(result.customTags).toContain('top-frame-same-origin');
    expect(result.warnedAboutEmitToOrigin).toBe(false);
  });
});
