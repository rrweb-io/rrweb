import * as fs from 'fs';
import * as path from 'path';
import { vi } from 'vitest';
import type * as puppeteer from 'puppeteer';
import { launchPuppeteer } from '../utils';

const html = `
<style>
  body { margin: 0; font: 16px sans-serif; }
  .h:hover { cursor: crosshair; }
  div, button, input { display: block; width: 200px; height: 30px; margin: 4px 0; }
</style>
<a id="link" href="#">link</a>
<p id="text">some paragraph text</p>
<button id="button">button</button>
<input id="input" />
<div id="div"></div>
<div id="hover" class="h"></div>
<div id="grab" style="cursor: grab"></div>
<div id="none" style="cursor: none"></div>
<div id="list" style="cursor: url(missing.png) 2 2, pointer"></div>
`;

const targets = [
  'link',
  'text',
  'text',
  'button',
  'input',
  'div',
  'hover',
  'grab',
  'none',
  'list',
];

describe('replayer cursor', () => {
  vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  let code: string;
  let styles: string;

  beforeAll(async () => {
    browser = await launchPuppeteer();
    code = fs.readFileSync(
      path.resolve(__dirname, '../../dist/rrweb.umd.cjs'),
      'utf8',
    );
    styles = fs.readFileSync(
      path.resolve(__dirname, '../../src/replay/styles/style.css'),
      'utf8',
    );
  });
  afterAll(async () => browser.close());

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent(html);
    await page.evaluate(code);
    // record the page, then add a mousemove onto the centre of each target, 100ms apart
    await page.evaluate(`
      const events = [];
      const stop = rrweb.record({ emit: (e) => events.push(e) });
      const start = events[0].timestamp;
      ${JSON.stringify(targets)}.forEach((id, i) => {
        const el = document.getElementById(id);
        const r = (el.firstChild && el.tagName !== 'BUTTON' ? (() => {
          const range = document.createRange();
          range.selectNodeContents(el.firstChild);
          return range.getBoundingClientRect();
        })() : el.getBoundingClientRect());
        events.push({
          type: 3,
          timestamp: start + 100 * (i + 1),
          data: {
            source: 1,
            positions: [{ x: r.left + r.width / 2, y: r.top + r.height / 2, id: rrweb.record.mirror.getId(el), timeOffset: 0 }],
          },
        });
      });
      events.push({ type: 3, timestamp: start + 750, data: { source: 2, type: 1, id: rrweb.record.mirror.getId(document.getElementById('grab')), x: 0, y: 0 } });
      stop();
      document.body.innerHTML = '';
      window.events = events;
      window.cursorAt = async (replayer, i) => {
        replayer.pause(100 * (i + 1) + 10);
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
        return document.querySelector('.replayer-mouse').dataset.cursor;
      };
      window.countStyleCalls = (replayer) => {
        const w = replayer.iframe.contentWindow;
        const orig = w.getComputedStyle.bind(w);
        window.styleCalls = 0;
        w.getComputedStyle = (...args) => (window.styleCalls++, orig(...args));
      };
    `);
    await page.addStyleTag({ content: styles });
  });
  afterEach(async () => page.close());

  it('resolves the cursor under the pointer', async () => {
    const seen = await page.evaluate(`(async () => {
      const replayer = new rrweb.Replayer(events, { cursor: { mode: 'state' } });
      const seen = [];
      for (let i = 0; i < ${targets.length}; i++) seen.push(await cursorAt(replayer, i));
      return seen;
    })()`);
    expect(seen).toEqual([
      'pointer',
      'text',
      'text',
      'default',
      'text',
      'default',
      'crosshair',
      'grabbing', // the MouseDown at 750 is still held
      'none',
      'pointer',
    ]);
  });

  it('falls back to default when the target is removed', async () => {
    const seen = await page.evaluate(`(async () => {
      const link = events.find((e) => e.type === 3 && e.data.source === 1).data.positions[0].id;
      const body = events.find((e) => e.type === 2).data.node.childNodes[0].childNodes[1].id;
      const removal = { type: 3, timestamp: events[0].timestamp + 150, data: { source: 0, texts: [], attributes: [], adds: [], removes: [{ parentId: body, id: link }] } };
      const replayer = new rrweb.Replayer(events.filter((e) => e.timestamp < removal.timestamp).concat(removal), { cursor: { mode: 'state' } });
      const before = await cursorAt(replayer, 0);
      replayer.pause(160);
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
      return [before, document.querySelector('.replayer-mouse').dataset.cursor];
    })()`);
    expect(seen).toEqual(['pointer', 'default']);
  });

  it('resolves auto to default when resolveAuto is off', async () => {
    const seen = await page.evaluate(`(async () => {
      const replayer = new rrweb.Replayer(events, { cursor: { mode: 'state', resolveAuto: false } });
      return [await cursorAt(replayer, 1), await cursorAt(replayer, 5)];
    })()`);
    expect(seen).toEqual(['default', 'default']);
  });

  it('emits CursorChange only when the cursor changes during playback', async () => {
    const r = await page.evaluate(`(async () => {
      const replayer = new rrweb.Replayer(events.slice(0, events.length - 7), { cursor: { mode: 'state' } });
      const changes = [];
      const cursors = [];
      replayer.on('cursor-change', (s) => changes.push(s.cursor + '/' + s.pointerType + '/' + s.pressed));
      replayer.play();
      const m = document.querySelector('.replayer-mouse');
      const t = performance.now();
      while (performance.now() - t < 700) {
        await new Promise((r) => requestAnimationFrame(r));
        if (m.dataset.cursor && cursors[cursors.length - 1] !== m.dataset.cursor) cursors.push(m.dataset.cursor);
      }
      return { changes, cursors, pointer: m.dataset.pointer };
    })()`);
    expect(r.cursors).toEqual(['pointer', 'text', 'default']);
    expect(r.changes).toEqual([
      'pointer/mouse/false',
      'text/mouse/false',
      'default/mouse/false',
    ]);
    expect(r.pointer).toBe('mouse');
  });

  it('never reads computed style in the default mode', async () => {
    const r = await page.evaluate(`(async () => {
      const replayer = new rrweb.Replayer(events);
      countStyleCalls(replayer);
      replayer.play();
      await new Promise((r) => setTimeout(r, 1200));
      const m = document.querySelector('.replayer-mouse');
      return { calls: styleCalls, attrs: m.getAttributeNames(), style: m.getAttribute('style') };
    })()`);
    expect(r.calls).toBe(0);
    expect(r.attrs).toEqual(['class', 'style']);
    expect(r.style).not.toContain('--rr-cursor');
  });

  it('resolves once after a seek, not during it', async () => {
    const r = await page.evaluate(`(async () => {
      const replayer = new rrweb.Replayer(events, { cursor: { mode: 'state' } });
      countStyleCalls(replayer);
      replayer.pause(1000);
      const during = styleCalls;
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
      return { during, after: styleCalls };
    })()`);
    expect(r).toEqual({ during: 0, after: 1 });
  });
});
