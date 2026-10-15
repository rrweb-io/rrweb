import * as fs from 'fs';
import * as path from 'path';
import type { Browser, Page } from 'puppeteer';
import type record from '../../src/record';
import type { eventWithTime } from '@rrweb/types';
import { launchPuppeteer } from '../utils';

interface RecorderWindow extends Window {
  rrweb: { record: typeof record };
}

describe('recorder stop memory', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await launchPuppeteer();
  });
  afterAll(async () => {
    await browser.close();
  });
  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(
      fs.readFileSync(
        path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
        'utf8',
      ),
    );
  });
  afterEach(async () => {
    await page.close();
  });

  it('releases discarded snapshots after repeated record/stop cycles', async () => {
    await page.evaluate(() => {
      // 5,000 elements plus text nodes, kept unchanged throughout the test.
      document.body.innerHTML = Array.from(
        { length: 1250 },
        (_, i) =>
          `<div><span>Field ${i}</span><p>Customer note ${i} lorem ipsum</p><input value="${i}"></div>`,
      ).join('');
    });
    const client = await page.target().createCDPSession();
    const heapSize = async () => {
      await client.send('HeapProfiler.collectGarbage');
      return (await page.metrics()).JSHeapUsedSize!;
    };
    const cycle = () =>
      page.evaluate(() => {
        let snapshots = 0;
        const stop = (window as unknown as RecorderWindow).rrweb.record({
          emit(event) {
            // Count without retaining events. A recorder-disabled mutant must fail.
            if (event.type === 2) snapshots++;
          },
        });
        stop?.();
        return snapshots;
      });
    expect(await cycle()).toBe(1); // Warm up before measuring.
    const before = await heapSize();
    for (let i = 0; i < 30; i++) expect(await cycle()).toBe(1);
    const after = await heapSize();
    expect(after - before).toBeLessThan(10 * 1024 * 1024);
    await client.detach();
  }, 60_000);

  it('records shadow and iframe mutations after checkout, reinsertion and restart', async () => {
    const result = await page.evaluate(async () => {
      const { record } = (window as unknown as RecorderWindow).rrweb;
      const tick = () => new Promise((resolve) => setTimeout(resolve, 30));
      const host = document.createElement('x-host');
      const root = host.attachShadow({ mode: 'open' });
      root.innerHTML = '<span>initial shadow</span>';
      document.body.append(host);
      const iframe = document.createElement('iframe');
      const loaded = new Promise((resolve) =>
        iframe.addEventListener('load', resolve, { once: true }),
      );
      iframe.srcdoc = '<p>initial iframe</p>';
      document.body.append(iframe);
      await loaded;
      const mutations: string[] = [];
      let snapshots = 0;
      const emit = (event: eventWithTime) => {
        if (event.type === 2) snapshots++;
        if (event.type === 3 && event.data.source === 0) {
          mutations.push(JSON.stringify(event.data));
        }
      };
      let stop = record({ emit });
      try {
        await tick();
        for (let i = 0; i < 3; i++) {
          record.takeFullSnapshot();
          root.firstChild!.textContent = `checkout-shadow-${i}`;
          await tick();
        }
        host.remove();
        await tick();
        document.body.append(host);
        await tick();
        root.firstChild!.textContent = 'reinserted-shadow';
        await tick();
        stop?.();
        stop = record({ emit });
        await tick();
        root.firstChild!.textContent = 'restarted-shadow';
        iframe.contentDocument!.querySelector('p')!.textContent =
          'restarted-iframe';
        await tick();
        return { snapshots, mutations };
      } finally {
        stop?.();
      }
    });
    expect(result.snapshots).toBe(5);
    for (const marker of [
      'checkout-shadow-0',
      'checkout-shadow-1',
      'checkout-shadow-2',
      'reinserted-shadow',
      'restarted-shadow',
      'restarted-iframe',
    ]) {
      expect(
        result.mutations.some((mutation) => mutation.includes(marker)),
      ).toBe(true);
    }
  });
});
