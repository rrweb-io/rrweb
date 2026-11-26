import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { createServer, ViteDevServer } from 'vite';
import * as puppeteer from 'puppeteer';
import type { Browser, JSHandle, Page } from 'puppeteer';
import { EventType, type eventWithTime, type pluginEvent } from '@rrweb/types';
import {
  PLUGIN_NAME,
  type KeydownPayload,
  type KeydownRecordOptions,
} from '../src/index';

const iframeInput = () =>
  document.querySelector('iframe')!.contentDocument!.querySelector('input');

const protectedFields = {
  'a password field': () => document.querySelector('#password'),
  'a password field in a shadow root': () =>
    document.querySelector('#host')!.shadowRoot!.querySelector('input'),
  'a password field in an iframe': iframeInput,
  'a password field revealed as text': () => {
    const password = document.querySelector<HTMLInputElement>('#password')!;
    password.type = 'text';
    return password;
  },
  'a field of a masked type': () => document.querySelector('#masked'),
};

describe('rrweb-plugin-keydown-record', () => {
  let server: ViteDevServer;
  let serverUrl: string;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    server = await createServer({
      preview: { port: 3000 },
      mode: 'test',
      server: { hmr: false },
    });
    await server.listen();
    serverUrl = server.resolvedUrls!.local[0];
    browser = await puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS ? true : false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  async function startRecording(
    options?: Partial<KeydownRecordOptions>,
    start = (o?: Partial<KeydownRecordOptions>) =>
      (window as any).startRecording(o),
  ) {
    await page.goto(`${serverUrl}test/html/index.html`);
    await page.evaluate(start, options);
    // the iframe's document is observed once its nodes are in the mirror
    await page.waitForFunction(
      (el) => (window as any).mirror.getId(el) > 0,
      {},
      await page.evaluateHandle(iframeInput),
    );
  }

  async function focus(field: JSHandle<Element | null>): Promise<number> {
    return field.evaluate((el) => {
      (el as HTMLElement).focus();
      return (window as any).mirror.getId(el) as number;
    });
  }

  async function keydownPayloads() {
    const events = await page.evaluate(
      () => (window as any).snapshots as eventWithTime[],
    );
    return events
      .filter(
        (e): e is pluginEvent<KeydownPayload> & { timestamp: number } =>
          e.type === EventType.Plugin && e.data.plugin === PLUGIN_NAME,
      )
      .map((e) => e.data.payload);
  }

  it('records command keys and shortcuts, not typed text or bare modifiers', async () => {
    await startRecording();
    const id = await focus(await page.$('#text'));
    await page.keyboard.type('ab');
    await page.keyboard.press('Enter');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');

    expect(await keydownPayloads()).toMatchObject([
      { id, key: 'Enter' },
      { id, key: 'a', code: 'KeyA', ctrlKey: true },
      { id, key: 'Escape' },
      { id, key: 'Tab' },
    ]);
  });

  it('treats characters composed with Alt or AltGr as typed text', async () => {
    await startRecording();
    const id = await focus(await page.$('#text'));
    await page.keyboard.down('Alt');
    await page.keyboard.press('a');
    await page.keyboard.up('Alt');
    await page.$eval('#text', (el) => {
      const init = { ctrlKey: true, altKey: true, bubbles: true };
      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          ...init,
          key: '@',
          modifierAltGraph: true,
        }),
      );
      el.dispatchEvent(new KeyboardEvent('keydown', { ...init, key: 'a' }));
    });

    expect(await keydownPayloads()).toMatchObject([
      { id, key: 'a', ctrlKey: true, altKey: true },
    ]);
  });

  it.each(Object.entries(protectedFields))(
    'recordPrintable records typed text, except in %s',
    async (_, find) => {
      // passwords are not among the masked types: they are skipped regardless
      await startRecording({
        recordPrintable: true,
        maskInputOptions: { email: true },
      });
      const protectedId = await focus(await page.evaluateHandle(find));
      await page.keyboard.type('hunter2');
      await page.keyboard.press('Enter');
      const textId = await focus(await page.$('#text'));
      await page.keyboard.type('x');

      expect(await keydownPayloads()).toMatchObject([
        { id: protectedId, key: 'Enter' },
        { id: textId, key: 'x' },
      ]);
    },
  );

  it('recordPrintable skips every field when all inputs are masked', async () => {
    await startRecording({ recordPrintable: true, maskAllInputs: true });
    const id = await focus(await page.$('#text'));
    await page.keyboard.type('x');
    await page.keyboard.press('Enter');
    await page.$eval('#text', (el) => (el as HTMLElement).blur());
    await page.keyboard.type('y');

    expect(await keydownPayloads()).toMatchObject([
      { id, key: 'Enter' },
      { key: 'y' },
    ]);
  });

  it.each<[string, Partial<KeydownRecordOptions>]>([
    ['#ignored', {}],
    ['#blocked', {}],
    ['#zoned', { blockSelector: '#zone' }],
    ['#zoned', { ignoreSelector: '#zoned' }],
  ])(
    'skips keys where the recorder ignores input: %s %o',
    async (selector, options) => {
      await startRecording(options);
      await focus(await page.$(selector));
      await page.keyboard.press('Enter');
      const id = await focus(await page.$('#text'));
      await page.keyboard.press('Enter');

      expect(await keydownPayloads()).toMatchObject([{ id, key: 'Enter' }]);
    },
  );

  it('takes a RegExp blockClass, like the recorder', async () => {
    await startRecording(undefined, () =>
      (window as any).startRecording({ blockClass: /^private-/ }),
    );
    await focus(await page.$('#zoned'));
    await page.keyboard.press('Enter');
    const id = await focus(await page.$('#text'));
    await page.keyboard.press('Enter');

    expect(await keydownPayloads()).toMatchObject([{ id, key: 'Enter' }]);
  });

  it('skips keydowns that belong to an IME composition', async () => {
    await startRecording();
    await page.$eval('#text', (el) => {
      const init = { key: 'Enter', bubbles: true };
      el.dispatchEvent(
        new KeyboardEvent('keydown', { ...init, isComposing: true }),
      );
      el.dispatchEvent(new KeyboardEvent('keydown', { ...init, key: 'Tab' }));
    });

    expect(await keydownPayloads()).toMatchObject([{ key: 'Tab' }]);
  });

  it('stops recording when the recorder stops', async () => {
    await startRecording();
    await focus(await page.$('#text'));
    await page.keyboard.press('Enter');
    await page.evaluate(() => (window as any).stopRecording());
    await page.keyboard.press('Escape');

    expect(await keydownPayloads()).toMatchObject([{ key: 'Enter' }]);
  });
});
