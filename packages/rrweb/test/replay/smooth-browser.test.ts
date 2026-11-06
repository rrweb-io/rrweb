import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';
import { EventType, IncrementalSource, type eventWithTime } from '@rrweb/types';
import { launchPuppeteer } from '../utils';
import type * as puppeteer from 'puppeteer';
import hoverEvents from '../events/hover';
import scrollEvents from '../events/scroll';
import iframeEvents from '../events/iframe-shadowdom-hover';

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

describe('smoothScroll', () => {
  vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });
  let browser: puppeteer.Browser;
  let code: string;

  beforeAll(async () => {
    browser = await launchPuppeteer();
    code = fs.readFileSync(
      path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
      'utf8',
    );
  });
  afterAll(async () => browser.close());

  it('seeks instantly when the page uses CSS scroll-behavior: smooth', async () => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(code);
    const smooth = JSON.stringify(scrollEvents)
      .replace('"lang":"en"', '"lang":"en","style":"scroll-behavior: smooth"')
      .replace(
        'overflow: scroll;',
        'overflow: scroll; scroll-behavior: smooth;',
      );
    await page.evaluate(`let events = ${smooth}`);
    const r = await page.evaluate(`(() => {
      const replayer = new rrweb.Replayer(events, { smoothScroll: true });
      const doc = replayer.iframe.contentDocument;
      replayer.pause(1200);
      const container = doc.getElementById('container').scrollTop;
      replayer.pause(1600);
      return { container, document: doc.defaultView.scrollY };
    })()`);
    expect(r).toEqual({ container: 2500, document: 250 });
    await page.close();
  });

  it('keeps a still cursor in place when the page scrolls a nested iframe', async () => {
    const t0 = iframeEvents[0].timestamp;
    const ev = JSON.parse(JSON.stringify(iframeEvents.slice(0, 5)));
    const body = ev[3].data.node.childNodes[1].childNodes[1];
    body.attributes = { style: 'height: 5000px; margin: 0' };
    body.childNodes[0].attributes = { style: 'margin-top: 300px' };
    ev.push({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.MouseMove,
        positions: [{ x: 20, y: 20, id: 14, timeOffset: 0 }],
      },
      timestamp: t0 + 600,
    });
    for (let i = 0; i <= 10; i++)
      ev.push({
        type: EventType.IncrementalSnapshot,
        data: { source: IncrementalSource.Scroll, id: 1, x: 0, y: i * 20 },
        timestamp: t0 + 1000 + i * 100,
      });
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(code);
    await page.evaluate(`let events = ${JSON.stringify(ev)}`);
    const tops = await page.evaluate(`(async () => {
      const replayer = new rrweb.Replayer(events, { smoothCursor: true, smoothScroll: true });
      replayer.play(800);
      const m = document.querySelector('.replayer-mouse');
      const seen = new Set();
      const start = performance.now();
      while (performance.now() - start < 1500) {
        await new Promise((r) => requestAnimationFrame(r));
        seen.add(m.style.top);
      }
      return [...seen].filter(Boolean);
    })()`);
    expect(tops.length).toBe(1);
    await page.close();
  });
});
