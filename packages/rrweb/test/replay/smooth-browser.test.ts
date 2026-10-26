import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';
import { EventType, IncrementalSource, type eventWithTime } from '@rrweb/types';
import { launchPuppeteer } from '../utils';
import type * as puppeteer from 'puppeteer';
import hoverEvents from '../events/hover';

const base = hoverEvents.slice(0, 4);
const BODY = 14;
const t0 = base[3].timestamp;
const positions = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    x: 100 + from + i * 10,
    y: 100 + Math.sin((from + i * 10) / 40) * 40,
    id: BODY,
    timeOffset: (i - n) * 50,
  }));
const mouseMove = (ts: number, n: number): eventWithTime => ({
  type: EventType.IncrementalSnapshot,
  data: { source: IncrementalSource.MouseMove, positions: positions(0, n) },
  timestamp: ts,
});
const events: eventWithTime[] = [
  ...base,
  mouseMove(t0 + 1000, 10),
  mouseMove(t0 + 1500, 10),
  mouseMove(t0 + 2000, 10),
  {
    type: EventType.IncrementalSnapshot,
    data: { source: IncrementalSource.Scroll, id: 1, x: 0, y: 0 },
    timestamp: t0 + 3000,
  },
];

describe('smoothCursor', () => {
  vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  let code: string;

  beforeAll(async () => {
    browser = await launchPuppeteer();
    code = fs.readFileSync(
      path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
      'utf8',
    );
  });
  afterAll(async () => browser.close());

  it('moves the cursor every frame between samples', async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(code);
    await page.evaluate(`let events = ${JSON.stringify(events)}`);
    const r = await page.evaluate(`(async () => {
      const replayer = new rrweb.Replayer(events, { smoothCursor: true });
      replayer.play(500);
      const m = document.querySelector('.replayer-mouse');
      const seen = [];
      const start = performance.now();
      while (performance.now() - start < 2200) {
        await new Promise((r) => requestAnimationFrame(r));
        seen.push(m.style.left + '|' + m.style.top + '|' + m.style.getPropertyValue('--rr-cursor-scale'));
      }
      return { frames: seen.length, distinct: new Set(seen).size, cls: m.className, sample: seen.filter((_, i) => i % 20 === 0) };
    })()`);
    console.log(JSON.stringify(r));
    expect(r.distinct).toBeGreaterThan(40);
    await page.close();
  });
});
