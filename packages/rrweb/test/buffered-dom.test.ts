import * as path from 'path';
import * as esbuild from 'esbuild';
import type * as puppeteer from 'puppeteer';
import {
  vi,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { EventType, type eventWithTime } from '@rrweb/types';
import { launchPuppeteer, sampleEvents } from './utils';

const T = sampleEvents[0].timestamp;
const DCL = sampleEvents[0];
const META = sampleEvents[2];
const FULLSNAPSHOT = sampleEvents[3];
const CLICK = sampleEvents[4];

const at = (base: eventWithTime, timestamp: number): eventWithTime => ({
  ...base,
  timestamp,
});

const click = (timestamp: number): eventWithTime => at(CLICK, timestamp);

const segmentStart = (ts: number, keyframe = false): eventWithTime =>
  ({
    type: EventType.Custom,
    timestamp: ts,
    data: { tag: 'segment-start', payload: { segmentStart: ts, keyframe } },
  } as unknown as eventWithTime);

const head: eventWithTime[] = [
  DCL,
  at(META, T),
  at(FULLSNAPSHOT, T),
  click(T + 50),
];

const noMarkers: eventWithTime[] = [...head, click(T + 100)];

const oneFrontier: eventWithTime[] = [...head, segmentStart(T + 100, true)];

const twoFrontiers: eventWithTime[] = [
  ...head,
  segmentStart(T + 100, true),
  segmentStart(T + 200, false),
];

const manyFrontiers: eventWithTime[] = [
  ...head,
  segmentStart(T + 100, true),
  segmentStart(T + 200, false),
  segmentStart(T + 300, false),
  segmentStart(T + 400, false),
  segmentStart(T + 500, false),
];

async function bundleReplayer(): Promise<string> {
  const rrwebDir = path.resolve(__dirname, '..');
  const typesSrc = path.resolve(rrwebDir, '../types/src/index.ts');
  const result = await esbuild.build({
    stdin: {
      contents:
        `export { Replayer } from ${JSON.stringify(
          path.resolve(rrwebDir, 'src/replay/index.ts'),
        )};\n` + `export { ReplayerEvents } from '@rrweb/types';\n`,
      resolveDir: rrwebDir,
      loader: 'ts',
    },
    bundle: true,
    format: 'iife',
    globalName: 'rrweb',
    platform: 'browser',
    loader: { '.css': 'empty' },
    write: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'alias-rrweb-types',
        setup(build) {
          build.onResolve({ filter: /^@rrweb\/types$/ }, () => ({
            path: typesSrc,
          }));
        },
      },
    ],
  });
  return result.outputFiles[0].text;
}

describe('buffered-dom replay', function () {
  vi.setConfig({ testTimeout: 20_000 });

  let code: string;
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    browser = await launchPuppeteer();
    code = await bundleReplayer();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(code);
    await page.evaluate(`
      var noMarkers = ${JSON.stringify(noMarkers)};
      var oneFrontier = ${JSON.stringify(oneFrontier)};
      var twoFrontiers = ${JSON.stringify(twoFrontiers)};
      var manyFrontiers = ${JSON.stringify(manyFrontiers)};
      var T = ${T};
      var CLICK = ${JSON.stringify(CLICK)};
      var click = (ts) => Object.assign({}, CLICK, { timestamp: ts });
      var segmentStart = (ts, keyframe) => ({
        type: ${EventType.Custom},
        timestamp: ts,
        data: { tag: 'segment-start', payload: { segmentStart: ts, keyframe: !!keyframe } },
      });
    `);
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('never fetches and finishes a recording with no segment-start markers', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        let fetched = false;
        let finished = false;
        const replayer = new Replayer(noMarkers, {
          fetchEvents: () => { fetched = true; return Promise.resolve([]); },
        });
        replayer.on(ReplayerEvents.Finish, () => { finished = true; });
        replayer.play(0);
        await new Promise((r) => setTimeout(r, 400));
        return { fetched, finished };
      })();
    `);
    expect(result.fetched).toBe(false);
    expect(result.finished).toBe(true);
  });

  it('prefetches the next segment by its segmentStart and plays through without stalling', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        const emitted = [];
        const cast = [];
        let finished = false;
        const replayer = new Replayer(oneFrontier, {
          fetchEvents: (cs) => { calls.push(cs); return Promise.resolve([click(T + 150)]); },
        });
        replayer.on(ReplayerEvents.BufferingStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.EventCast, (e) => cast.push(e.timestamp));
        replayer.on(ReplayerEvents.Finish, () => { finished = true; });
        replayer.play(0);
        await new Promise((r) => setTimeout(r, 500));
        return { calls, emitted, maxCast: Math.max(0, ...cast), finished };
      })();
    `);
    expect(result.calls).toEqual([T + 100]);
    expect(typeof result.calls[0]).toBe('number');
    expect(result.emitted).not.toContain('start');
    expect(result.maxCast).toBe(T + 150);
    expect(result.finished).toBe(true);
  });

  it('stalls at the frontier while the fetch is pending and casts nothing past it', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        const emitted = [];
        const cast = [];
        const replayer = new Replayer(oneFrontier, {
          fetchEvents: (cs) => { calls.push(cs); return new Promise(() => {}); },
        });
        replayer.on(ReplayerEvents.BufferingStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.BufferingEnd, () => emitted.push('end'));
        replayer.on(ReplayerEvents.EventCast, (e) => cast.push(e.timestamp));
        replayer.play(0);
        await new Promise((r) => setTimeout(r, 400));
        return { calls, emitted, maxCast: Math.max(0, ...cast) };
      })();
    `);
    expect(result.calls).toEqual([T + 100]);
    expect(result.emitted).toContain('start');
    expect(result.emitted).not.toContain('end');
    expect(result.maxCast).toBeLessThanOrEqual(T + 100);
  });

  it('buffers on a seek into an unheld segment, fetches it, then resumes at the target', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        const emitted = [];
        const cast = [];
        const replayer = new Replayer(oneFrontier, {
          fetchEvents: (cs) => { calls.push(cs); return Promise.resolve([click(T + 150)]); },
        });
        replayer.on(ReplayerEvents.BufferingStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.BufferingEnd, () => emitted.push('end'));
        replayer.on(ReplayerEvents.EventCast, (e) => cast.push(e.timestamp));
        replayer.play(150);
        await new Promise((r) => setTimeout(r, 400));
        return { calls, emitted, maxCast: Math.max(0, ...cast) };
      })();
    `);
    expect(result.calls).toEqual([T + 100]);
    expect(result.emitted).toEqual(['start', 'end']);
    expect(result.maxCast).toBe(T + 150);
  });

  it('retries after an empty (contract-violating) response, then resumes', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        const emitted = [];
        const cast = [];
        let n = 0;
        const replayer = new Replayer(oneFrontier, {
          fetchEvents: (cs) => {
            calls.push(cs);
            n += 1;
            return Promise.resolve(n === 1 ? [] : [click(T + 150)]);
          },
        });
        replayer.on(ReplayerEvents.BufferingStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.BufferingEnd, () => emitted.push('end'));
        replayer.on(ReplayerEvents.EventCast, (e) => cast.push(e.timestamp));
        replayer.play(150);
        await new Promise((r) => setTimeout(r, 400));
        return { calls, emitted, maxCast: Math.max(0, ...cast) };
      })();
    `);
    expect(result.calls).toEqual([T + 100, T + 100]);
    expect(result.emitted).toEqual(['start', 'end']);
    expect(result.maxCast).toBe(T + 150);
  });

  it('resolves a superseded boundary from a response that spans past it (no refetch of the swallowed segment)', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        let finished = false;
        const replayer = new Replayer(twoFrontiers, {
          fetchEvents: (cs) => {
            calls.push(cs);
            if (cs === T + 100) {
              return Promise.resolve([click(T + 150), click(T + 250), segmentStart(T + 300)]);
            }
            if (cs === T + 300) {
              return Promise.resolve([click(T + 350)]);
            }
            return Promise.resolve([]);
          },
        });
        replayer.on(ReplayerEvents.Finish, () => { finished = true; });
        replayer.play(150);
        await new Promise((r) => setTimeout(r, 600));
        return { calls, finished };
      })();
    `);
    expect(result.calls).toContain(T + 100);
    expect(result.calls).toContain(T + 300);
    expect(result.calls).not.toContain(T + 200);
    expect(result.finished).toBe(true);
  });

  it('clips events that bleed past the next known boundary so they are not double-applied', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const cast = [];
        let finished = false;
        const replayer = new Replayer(twoFrontiers, {
          fetchEvents: (cs) => {
            if (cs === T + 100) return Promise.resolve([click(T + 150), click(T + 250)]);
            if (cs === T + 200) return Promise.resolve([click(T + 250)]);
            return Promise.resolve([]);
          },
        });
        replayer.on(ReplayerEvents.EventCast, (e) => cast.push(e.timestamp));
        replayer.on(ReplayerEvents.Finish, () => { finished = true; });
        replayer.play(0);
        await new Promise((r) => setTimeout(r, 600));
        return {
          finished,
          castAt250: cast.filter((t) => t === T + 250).length,
        };
      })();
    `);
    expect(result.castAt250).toBe(1);
    expect(result.finished).toBe(true);
  });

  it('caps concurrent fetches', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer } = rrweb;
        let calls = 0;
        const replayer = new Replayer(manyFrontiers, {
          fetchEvents: () => { calls += 1; return new Promise(() => {}); },
        });
        replayer.play(0);
        await new Promise((r) => setTimeout(r, 300));
        return { calls };
      })();
    `);
    expect(result.calls).toBe(3);
  });

  it('does not re-fetch a segment that is already in flight when buffering kicks in', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        const emitted = [];
        const replayer = new Replayer(manyFrontiers, {
          fetchEvents: (cs) => { calls.push(cs); return new Promise(() => {}); },
        });
        replayer.on(ReplayerEvents.BufferingStart, () => emitted.push('start'));
        replayer.play(0);
        await new Promise((r) => setTimeout(r, 400));
        return {
          calls,
          uniqueCalls: Array.from(new Set(calls)).length,
          firstCount: calls.filter((c) => c === T + 100).length,
          emitted,
        };
      })();
    `);
    expect(result.emitted).toContain('start');
    expect(result.calls.length).toBe(3);
    expect(result.uniqueCalls).toBe(3);
    expect(result.firstCount).toBe(1);
  });

  it('refills past the cap as fetches return, eventually fetching every segment', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        let finished = false;
        const replayer = new Replayer(manyFrontiers, {
          fetchEvents: (cs) => { calls.push(cs); return Promise.resolve([click(cs + 50)]); },
        });
        replayer.on(ReplayerEvents.Finish, () => { finished = true; });
        replayer.play(0);
        await new Promise((r) => setTimeout(r, 900));
        return { calls: Array.from(new Set(calls)).sort((a, b) => a - b), finished };
      })();
    `);
    expect(result.calls).toEqual([T + 100, T + 200, T + 300, T + 400, T + 500]);
    expect(result.finished).toBe(true);
  });

  it('emits BufferingError (and still BufferingEnd) after retries are exhausted', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        let calls = 0;
        const emitted = [];
        let errorPayload = null;
        const replayer = new Replayer(oneFrontier, {
          fetchEvents: () => { calls += 1; return Promise.reject(new Error('boom')); },
        });
        replayer.on(ReplayerEvents.BufferingStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.BufferingError, (d) => { emitted.push('error'); errorPayload = d; });
        replayer.on(ReplayerEvents.BufferingEnd, () => emitted.push('end'));
        replayer.play(150);
        await new Promise((r) => setTimeout(r, 400));
        return { calls, emitted, errorPayload };
      })();
    `);
    expect(result.calls).toBe(3);
    expect(result.emitted).toEqual(['start', 'error', 'end']);
    expect(result.errorPayload.segmentStarts).toContain(T + 100);
  });
});
