import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Browser, Page } from 'puppeteer';
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from 'vitest';
import type { eventWithTime } from '@rrweb/types';
import { launchPuppeteer, waitForRAF } from '../utils';

type TestWindow = Window & {
  rrweb: typeof import('../../src');
  events: eventWithTime[];
  container: HTMLElement | ShadowRoot;
  root: ShadowRoot;
};

describe('iframe navigation', () => {
  let browser: Browser;
  let page: Page;
  let server: Server;
  let origin: string;
  let code: string;

  beforeAll(async () => {
    code = readFileSync(resolve(__dirname, '../../dist/rrweb.umd.cjs'), 'utf8');
    browser = await launchPuppeteer();
    server = createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!DOCTYPE html><p>frame-initial</p><script>${code}
        window.events = [];
        window.stopRecording = rrweb.record({recordCrossOriginIframes: true,
          emit: event => window.events.push(event)});
        </script>`);
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    origin = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(origin);
  });

  afterEach(async () => {
    await page.close();
  });

  async function replay(recorded: eventWithTime[]) {
    const replayPage = await browser.newPage();
    await replayPage.evaluate(code);
    await replayPage.evaluate((recorded) => {
      const win = window as TestWindow;
      const replayer = new win.rrweb.Replayer(recorded, {
        useVirtualDom: false,
      });
      replayer.pause(
        recorded[recorded.length - 1].timestamp - recorded[0].timestamp + 1,
      );
    }, recorded);
    return replayPage;
  }

  it('keeps observing an open root after an unrelated iframe navigates', async () => {
    await page.evaluate(() => {
      const win = window as TestWindow;
      const host = document.createElement('x-host');
      host.id = 'host';
      document.body.appendChild(host);
      win.root = host.attachShadow({ mode: 'open' });
      win.root.innerHTML = '<p>shadow-initial</p>';
      const iframe = document.createElement('iframe');
      iframe.id = 'unrelated';
      document.body.appendChild(iframe);
    });
    await waitForRAF(page);
    await page.evaluate(async () => {
      const iframe = document.querySelector<HTMLIFrameElement>('#unrelated')!;
      await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        iframe.srcdoc = '<p>navigated</p>';
      });
    });
    await waitForRAF(page);
    await page.evaluate(() => {
      (window as TestWindow).root.querySelector('p')!.textContent =
        'shadow-after-navigation';
    });
    await waitForRAF(page);
    const recorded = await page.evaluate(() => (window as TestWindow).events);
    expect(JSON.stringify(recorded)).toContain('shadow-after-navigation');
    const replayPage = await replay(recorded);
    try {
      expect(
        await replayPage.evaluate(
          () =>
            document
              .querySelector('iframe')!
              .contentDocument!.querySelector('#host')!
              .shadowRoot!.querySelector('p')!.textContent,
        ),
      ).toBe('shadow-after-navigation');
    } finally {
      await replayPage.close();
    }
  });

  for (const inShadow of [false, true]) {
    for (const crossOrigin of [false, true]) {
      it(`records ${
        crossOrigin ? 'cross-origin' : 'same-origin'
      } navigation from an empty iframe in ${
        inShadow ? 'an open root' : 'ordinary DOM'
      }`, async () => {
        await page.evaluate((inShadow) => {
          const win = window as TestWindow;
          const host = document.createElement('x-host');
          host.id = 'host';
          document.body.appendChild(host);
          win.container = inShadow ? host.attachShadow({ mode: 'open' }) : host;
          const iframe = document.createElement('iframe');
          iframe.id = 'delayed-frame';
          win.container.appendChild(iframe);
        }, inShadow);
        await page.waitForFunction(() => {
          const win = window as TestWindow;
          const iframe = win.container.querySelector('iframe')!;
          return win.events.some(
            (event) =>
              event.type === 3 &&
              event.data.source === 0 &&
              event.data.isAttachIframe &&
              event.data.adds.some(
                (add) =>
                  add.parentId === win.rrweb.record.mirror.getId(iframe) &&
                  add.node.type === 0,
              ),
          );
        });
        const oldDocumentId = await page.evaluate(() => {
          const win = window as TestWindow;
          return win.rrweb.record.mirror.getId(
            win.container.querySelector('iframe')!.contentDocument!,
          );
        });
        expect(oldDocumentId).toBeGreaterThan(0);
        await page.evaluate((src) => {
          (window as TestWindow).container.querySelector('iframe')!.src = src;
        }, `${crossOrigin ? origin.replace('localhost', '127.0.0.1') : origin}/child`);
        const child = await page.waitForFrame((frame) =>
          frame.url().endsWith('/child'),
        );
        await child.waitForSelector('p');
        await child.evaluate(() => {
          document.querySelector('p')!.textContent = 'after-navigation-content';
        });
        await page.waitForFunction(
          () =>
            JSON.stringify((window as TestWindow).events).includes(
              'after-navigation-content',
            ),
          { timeout: 3000 },
        );
        expect(
          await page.evaluate(
            (id) => (window as TestWindow).rrweb.record.mirror.getNode(id),
            oldDocumentId,
          ),
        ).toBeNull();
        const recorded = await page.evaluate(
          () => (window as TestWindow).events,
        );
        await page.close();
        page = await browser.newPage();
        const replayPage = await replay(recorded);
        try {
          expect(
            await replayPage.evaluate((inShadow) => {
              const doc = document.querySelector('iframe')!.contentDocument!;
              const host = doc.querySelector('#host')!;
              const container = inShadow ? host.shadowRoot! : host;
              return container
                .querySelector('iframe')!
                .contentDocument!.querySelector('p')?.textContent;
            }, inShadow),
          ).toBe('after-navigation-content');
        } finally {
          await replayPage.close();
        }
      });
    }
  }
});
