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
import { launchPuppeteer, sampleEvents } from '../../rrweb/test/utils';

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
    data: {
      tag: 'segment-start',
      omitFromTimeline: true,
      payload: { segmentStart: ts, keyframe },
    },
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
  const rrwebDir = path.resolve(__dirname, '../../rrweb');
  const typesSrc = path.resolve(rrwebDir, '../types/src/index.ts');
  const result = await esbuild.build({
    stdin: {
      contents:
        `export { Replayer } from ${JSON.stringify(
          path.resolve(rrwebDir, 'src/replay/index.ts'),
        )};\n` +
        `export { SegmentController } from ${JSON.stringify(
          path.resolve(__dirname, '../src/segment-controller.ts'),
        )};\n` +
        `export { ReplayerEvents } from '@rrweb/types';\n`,
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
        name: 'alias-rrweb',
        setup(build) {
          build.onResolve({ filter: /^@rrweb\/types$/ }, () => ({
            path: typesSrc,
          }));
          build.onResolve({ filter: /^@rrweb\/replay$/ }, () => ({
            path: path.resolve(rrwebDir, 'src/entries/replay.ts'),
          }));
        },
      },
    ],
  });
  return result.outputFiles[0].text;
}

describe('segmented-dom replay', function () {
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
      var fromTs = (q) => +new URLSearchParams(q).get('from');
      var segmentStart = (ts, keyframe) => ({
        type: ${EventType.Custom},
        timestamp: ts,
        data: { tag: 'segment-start', omitFromTimeline: true, payload: { segmentStart: ts, keyframe: !!keyframe } },
      });
      var segmentBuffer = (fetchFn, aheadMs) => (core) =>
        new rrweb.SegmentController(core, fetchFn, aheadMs);
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
          createStallController: segmentBuffer(() => { fetched = true; return Promise.resolve([]); }),
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
          createStallController: segmentBuffer((cs) => { calls.push(fromTs(cs)); return Promise.resolve([click(T + 150)]); }),
        });
        replayer.on(ReplayerEvents.StallStart, () => emitted.push('start'));
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
          createStallController: segmentBuffer((cs) => { calls.push(fromTs(cs)); return new Promise(() => {}); }),
        });
        replayer.on(ReplayerEvents.StallStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.StallEnd, () => emitted.push('end'));
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
          createStallController: segmentBuffer((cs) => { calls.push(fromTs(cs)); return Promise.resolve([click(T + 150)]); }),
        });
        replayer.on(ReplayerEvents.StallStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.StallEnd, () => emitted.push('end'));
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
          createStallController: segmentBuffer((cs) => {
            calls.push(fromTs(cs));
            n += 1;
            return Promise.resolve(n === 1 ? [] : [click(T + 150)]);
          }),
        });
        replayer.on(ReplayerEvents.StallStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.StallEnd, () => emitted.push('end'));
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
          createStallController: segmentBuffer((cs) => {
            calls.push(fromTs(cs));
            if (fromTs(cs) === T + 100) {
              return Promise.resolve([click(T + 150), click(T + 250), segmentStart(T + 300)]);
            }
            if (fromTs(cs) === T + 300) {
              return Promise.resolve([click(T + 350)]);
            }
            return Promise.resolve([]);
          }),
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
          createStallController: segmentBuffer((cs) => {
            if (fromTs(cs) === T + 100) return Promise.resolve([click(T + 150), click(T + 250)]);
            if (fromTs(cs) === T + 200) return Promise.resolve([click(T + 250)]);
            return Promise.resolve([]);
          }),
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
          createStallController: segmentBuffer(() => { calls += 1; return new Promise(() => {}); }),
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
          createStallController: segmentBuffer((cs) => { calls.push(fromTs(cs)); return new Promise(() => {}); }),
        });
        replayer.on(ReplayerEvents.StallStart, () => emitted.push('start'));
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
          createStallController: segmentBuffer((cs) => { calls.push(fromTs(cs)); return Promise.resolve([click(fromTs(cs) + 50)]); }),
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

  it('emits StallError (and still StallEnd) after retries are exhausted', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        let calls = 0;
        const emitted = [];
        let errorPayload = null;
        const replayer = new Replayer(oneFrontier, {
          createStallController: segmentBuffer(() => { calls += 1; return Promise.reject(new Error('boom')); }),
        });
        replayer.on(ReplayerEvents.StallStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.StallError, (d) => { emitted.push('error'); errorPayload = d; });
        replayer.on(ReplayerEvents.StallEnd, () => emitted.push('end'));
        replayer.play(150);
        await new Promise((r) => setTimeout(r, 400));
        return { calls, emitted, errorPayload };
      })();
    `);
    expect(result.calls).toBe(3);
    expect(result.emitted).toEqual(['start', 'error', 'end']);
    expect(result.errorPayload.segmentStarts).toContain(T + 100);
  });

  it('stays paused when the user pauses mid-stall and the segment then arrives', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        let releaseFetch = null;
        const cast = [];
        const replayer = new Replayer(oneFrontier, {
          createStallController: segmentBuffer(
            () => new Promise((resolve) => {
              releaseFetch = () => resolve([click(T + 150)]);
            }),
          ),
        });
        replayer.on(ReplayerEvents.EventCast, (e) => cast.push(e.timestamp));
        replayer.play(0);
        await new Promise((r) => setTimeout(r, 300));
        const stateWhileStalled = replayer.service.state.value;
        replayer.pause();
        const stateAfterPause = replayer.service.state.value;
        releaseFetch();
        await new Promise((r) => setTimeout(r, 300));
        return {
          stateWhileStalled,
          stateAfterPause,
          finalState: replayer.service.state.value,
          castPastStall: cast.filter((t) => t > T + 100).length,
        };
      })();
    `);
    expect(result.stateWhileStalled).toBe('stalled');
    expect(result.stateAfterPause).toBe('paused');
    expect(result.finalState).toBe('paused');
    expect(result.castPastStall).toBe(0);
  });

  it('injectEvents preserves input order for events sharing a timestamp', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer } = rrweb;
        const replayer = new Replayer(oneFrontier, {});
        const ts = T + 120;
        const mark = (id) => ({
          type: ${EventType.Custom},
          timestamp: ts,
          data: { tag: 'mark', payload: id },
        });
        replayer.injectEvents([mark('a'), mark('b'), mark('c')]);
        replayer.injectEvents([mark('d'), mark('e')]);
        const order = replayer.service.state.context.events
          .filter((e) => e.timestamp === ts)
          .map((e) => e.data.payload);
        return { order };
      })();
    `);
    expect(result.order).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('emits buffering start/end around a loading stall', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer } = rrweb;
        const emitted = [];
        const replayer = new Replayer(oneFrontier, {
          createStallController: segmentBuffer((cs) =>
            Promise.resolve([click(T + 150)]),
          ),
        });
        replayer.on('buffering-start', () => emitted.push('buffering-start'));
        replayer.on('buffering-end', () => emitted.push('buffering-end'));
        replayer.play(150);
        await new Promise((r) => setTimeout(r, 400));
        return { emitted };
      })();
    `);
    expect(result.emitted).toEqual(['buffering-start', 'buffering-end']);
  });

  it('marks a segment fetched when its batch is a single event exactly at the segment start', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        const emitted = [];
        const cast = [];
        let finished = false;
        const replayer = new Replayer(oneFrontier, {
          createStallController: segmentBuffer((cs) => { calls.push(fromTs(cs)); return Promise.resolve([click(fromTs(cs))]); }),
        });
        replayer.on(ReplayerEvents.StallStart, () => emitted.push('start'));
        replayer.on(ReplayerEvents.StallEnd, () => emitted.push('end'));
        replayer.on(ReplayerEvents.StallError, () => emitted.push('error'));
        replayer.on(ReplayerEvents.EventCast, (e) => cast.push(e.timestamp));
        replayer.on(ReplayerEvents.Finish, () => { finished = true; });
        replayer.play(100);
        await new Promise((r) => setTimeout(r, 400));
        return { calls, emitted, finished, maxCast: Math.max(0, ...cast) };
      })();
    `);
    expect(result.calls).toEqual([T + 100]);
    expect(result.emitted).toEqual(['start', 'end']);
    expect(result.finished).toBe(true);
    expect(result.maxCast).toBe(T + 100);
  });

  it('swallows a known inner boundary when a batch straddles it', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        const cast = [];
        let finished = false;
        const replayer = new Replayer(twoFrontiers, {
          createStallController: segmentBuffer((cs) => {
            calls.push(fromTs(cs));
            return Promise.resolve([click(T + 150), click(T + 250)]);
          }),
        });
        replayer.on(ReplayerEvents.EventCast, (e) => cast.push(e.timestamp));
        replayer.on(ReplayerEvents.Finish, () => { finished = true; });
        replayer.play(150);
        await new Promise((r) => setTimeout(r, 400));
        return { calls, finished, maxCast: Math.max(0, ...cast) };
      })();
    `);
    expect(result.calls).toEqual([T + 100]);
    expect(result.finished).toBe(true);
    expect(result.maxCast).toBe(T + 250);
  });

  it('does not over-reach: a known marker past the last event stays unfetched', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        let finished = false;
        const replayer = new Replayer(twoFrontiers, {
          createStallController: segmentBuffer((cs) => {
            calls.push(fromTs(cs));
            if (fromTs(cs) === T + 100) return Promise.resolve([click(T + 150), click(T + 180)]);
            return Promise.resolve([click(T + 250)]);
          }),
        });
        replayer.on(ReplayerEvents.Finish, () => { finished = true; });
        replayer.play(150);
        await new Promise((r) => setTimeout(r, 400));
        return { calls, finished };
      })();
    `);
    expect(result.calls).toEqual([T + 100, T + 200]);
    expect(result.finished).toBe(true);
  });

  it('leaves the gap between two adjacent markers unfetched', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer } = rrweb;
        const calls = [];
        const replayer = new Replayer(oneFrontier, {
          createStallController: segmentBuffer((cs) => {
            calls.push(fromTs(cs));
            if (fromTs(cs) === T + 100) return Promise.resolve([click(T + 120), segmentStart(T + 200), segmentStart(T + 300)]);
            return Promise.resolve([click(T + 250)]);
          }),
        });
        replayer.pause(150);
        await new Promise((r) => setTimeout(r, 200));
        replayer.pause(250);
        await new Promise((r) => setTimeout(r, 200));
        return { calls };
      })();
    `);
    expect(result.calls).toEqual([T + 100, T + 200]);
  });

  it('keeps a trailing frontier marker as an unfetched stall point', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer, ReplayerEvents } = rrweb;
        const calls = [];
        let finished = false;
        const replayer = new Replayer(oneFrontier, {
          createStallController: segmentBuffer((cs) => {
            calls.push(fromTs(cs));
            if (fromTs(cs) === T + 100) return Promise.resolve([click(T + 150), segmentStart(T + 300)]);
            return Promise.resolve([click(T + 350)]);
          }),
        });
        replayer.on(ReplayerEvents.Finish, () => { finished = true; });
        replayer.play(150);
        await new Promise((r) => setTimeout(r, 400));
        return { calls, finished };
      })();
    `);
    expect(result.calls).toEqual([T + 100, T + 300]);
    expect(result.finished).toBe(true);
  });

  it('preserves an unfetched marker that precedes an already-fetched marker (pop-bug regression)', async () => {
    const result = await page.evaluate(`
      (async () => {
        const { Replayer } = rrweb;
        const calls = [];
        const events = oneFrontier.concat([segmentStart(T + 200, true)]);
        const replayer = new Replayer(events, {
          createStallController: segmentBuffer((cs) => {
            calls.push(fromTs(cs));
            if (fromTs(cs) === T + 200) return Promise.resolve([click(T + 230)]);
            if (fromTs(cs) === T + 100) return Promise.resolve([click(T + 120), segmentStart(T + 150), segmentStart(T + 200), click(T + 220)]);
            if (fromTs(cs) === T + 150) return Promise.resolve([click(T + 160)]);
            return Promise.resolve([]);
          }),
        });
        replayer.pause(250);
        await new Promise((r) => setTimeout(r, 200));
        replayer.pause(150);
        await new Promise((r) => setTimeout(r, 300));
        return { calls };
      })();
    `);
    expect(result.calls).toEqual([T + 200, T + 100, T + 150]);
  });
});
