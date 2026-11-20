import * as fs from 'fs';
import * as path from 'path';
import type * as puppeteer from 'puppeteer';
import { vi } from 'vitest';
import { launchPuppeteer, sampleEvents as events } from './utils';

type IWindow = Window &
  typeof globalThis & {
    rrweb: typeof import('../src');
    events: typeof events;
  };

const totalTime = events[events.length - 1].timestamp - events[0].timestamp;

describe('replayer stall', () => {
  vi.setConfig({ testTimeout: 15_000 });

  let code: string;
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    browser = await launchPuppeteer();
    code = fs.readFileSync(
      path.resolve(__dirname, '../dist/rrweb.umd.cjs'),
      'utf8',
    );
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('about:blank');
    await page.evaluate(code);
    await page.evaluate(`var events = ${JSON.stringify(events)}`);
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('getCurrentTime() reports the seek target while stalled on a seek', async () => {
    const result = await page.evaluate((stallAt) => {
      const win = window as IWindow;
      const { Replayer } = win.rrweb;
      const replayer = new Replayer(win.events, {});
      replayer.addStallController({
        registerEvent() {},
        isStallMarker() {
          return false;
        },
        stallOnPlay(timeOffset: number) {
          if (timeOffset !== stallAt) return false;
          if (!replayer.isStalled()) replayer.stall();
          return true;
        },
        stallOnPause(timeOffset: number) {
          if (timeOffset !== stallAt) return false;
          if (!replayer.isStalled()) replayer.stall();
          return true;
        },
      });
      replayer.play(stallAt);
      return {
        stalled: replayer.isStalled(),
        currentTime: replayer.getCurrentTime(),
        isPlaying: replayer.isPlaying(),
      };
    }, 3000);

    expect(result.stalled).toBe(true);
    expect(result.currentTime).toBe(3000);
    expect(result.isPlaying).toBe(true);
  });

  it('a resolved seek-stall resumes instead of re-stalling at the stale target', async () => {
    const result = await page.evaluate((stallAt) => {
      const win = window as IWindow;
      const { Replayer } = win.rrweb;
      const replayer = new Replayer(win.events, {});
      let unheld = true;
      replayer.addStallController({
        registerEvent() {},
        isStallMarker() {
          return false;
        },
        stallOnPlay(timeOffset: number) {
          if (!unheld || timeOffset !== stallAt) return false;
          if (!replayer.isStalled()) replayer.stall();
          return true;
        },
        stallOnPause() {
          return false;
        },
      });
      replayer.play(stallAt);
      const stalledTarget = replayer.getCurrentTime();
      unheld = false;
      replayer.play();
      return {
        stalledTarget,
        resumedStalled: replayer.isStalled(),
        resumedTime: replayer.getCurrentTime(),
      };
    }, 3000);

    expect(result.stalledTarget).toBe(3000);
    expect(result.resumedStalled).toBe(false);
    expect(result.resumedTime).toBe(3000);
  });

  it('replays from the start after finishing, not from the end', async () => {
    const result = (await page.evaluate(() => {
      return new Promise((resolve) => {
        const win = window as IWindow;
        const { Replayer, ReplayerEvents } = win.rrweb;
        const replayer = new Replayer(win.events, { speed: 999 });
        replayer.on(ReplayerEvents.Finish, () => {
          const atFinish = replayer.getCurrentTime();
          replayer.play();
          resolve({ atFinish, afterReplay: replayer.getCurrentTime() });
        });
        replayer.play();
      });
    })) as { atFinish: number; afterReplay: number };

    expect(result.atFinish).toBeGreaterThan(totalTime - 200);
    expect(result.afterReplay).toBeLessThan(200);
  });

  it('abortStall() unpins getCurrentTime() from the unreachable seek target', async () => {
    const result = await page.evaluate((stallAt) => {
      const win = window as IWindow;
      const { Replayer } = win.rrweb;
      const replayer = new Replayer(win.events, {});
      replayer.addStallController({
        registerEvent() {},
        isStallMarker() {
          return false;
        },
        stallOnPlay(timeOffset: number) {
          if (timeOffset !== stallAt) return false;
          if (!replayer.isStalled()) replayer.stall();
          return true;
        },
        stallOnPause() {
          return false;
        },
      });
      replayer.play(stallAt);
      const stalledTime = replayer.getCurrentTime();
      replayer.abortStall();
      return {
        stalledTime,
        stalled: replayer.isStalled(),
        abortedTime: replayer.getCurrentTime(),
      };
    }, 3000);

    expect(result.stalledTime).toBe(3000);
    expect(result.stalled).toBe(false);
    expect(result.abortedTime).not.toBe(3000);
  });

  it('a seek-stall reflects the caller intent (play vs pause), not the FSM state it entered from', async () => {
    const result = await page.evaluate((stallAt) => {
      const win = window as IWindow;
      const { Replayer } = win.rrweb;
      const staller = (replayer: InstanceType<typeof Replayer>) => ({
        registerEvent() {},
        isStallMarker() {
          return false;
        },
        stallOnPlay(timeOffset: number) {
          if (timeOffset !== stallAt) return false;
          if (!replayer.isStalled()) replayer.stall();
          return true;
        },
        stallOnPause(timeOffset: number) {
          if (timeOffset !== stallAt) return false;
          if (!replayer.isStalled()) replayer.stall();
          return true;
        },
      });

      const playing = new Replayer(win.events, {});
      playing.addStallController(staller(playing));
      playing.play(stallAt);

      const paused = new Replayer(win.events, {});
      paused.addStallController(staller(paused));
      paused.pause(stallAt);

      return {
        viaPlay: {
          stalled: playing.isStalled(),
          isPlaying: playing.isPlaying(),
          isPaused: playing.isPaused(),
        },
        viaPause: {
          stalled: paused.isStalled(),
          isPlaying: paused.isPlaying(),
          isPaused: paused.isPaused(),
        },
      };
    }, 3000);

    expect(result.viaPlay).toEqual({
      stalled: true,
      isPlaying: true,
      isPaused: false,
    });
    expect(result.viaPause).toEqual({
      stalled: true,
      isPlaying: false,
      isPaused: true,
    });
  });

  it('clearStall() resumes a resolved stall to the caller intent (play or pause)', async () => {
    const result = await page.evaluate((stallAt) => {
      const win = window as IWindow;
      const { Replayer } = win.rrweb;
      const staller = (replayer: InstanceType<typeof Replayer>) => {
        let held = true;
        return {
          registerEvent() {},
          isStallMarker() {
            return false;
          },
          stallOnPlay(timeOffset: number) {
            if (!held || timeOffset !== stallAt) return false;
            if (!replayer.isStalled()) replayer.stall();
            return true;
          },
          stallOnPause(timeOffset: number) {
            if (!held || timeOffset !== stallAt) return false;
            if (!replayer.isStalled()) replayer.stall();
            return true;
          },
          resolve() {
            held = false;
          },
        };
      };

      const playing = new Replayer(win.events, {});
      const playCtrl = staller(playing);
      playing.addStallController(playCtrl);
      playing.play(stallAt);
      playCtrl.resolve();
      playing.clearStall();

      const paused = new Replayer(win.events, {});
      const pauseCtrl = staller(paused);
      paused.addStallController(pauseCtrl);
      paused.pause(stallAt);
      pauseCtrl.resolve();
      paused.clearStall();

      return {
        playing: {
          stalled: playing.isStalled(),
          isPlaying: playing.isPlaying(),
          time: playing.getCurrentTime(),
        },
        paused: {
          stalled: paused.isStalled(),
          isPaused: paused.isPaused(),
          time: paused.getCurrentTime(),
        },
      };
    }, 3000);

    expect(result.playing).toEqual({
      stalled: false,
      isPlaying: true,
      time: 3000,
    });
    expect(result.paused).toEqual({
      stalled: false,
      isPaused: true,
      time: 3000,
    });
  });

  it('stalls at the moment playback reaches an unresolved stall marker', async () => {
    const result = await page.evaluate((markerOffset) => {
      return new Promise((resolve, reject) => {
        const win = window as IWindow;
        const { Replayer, ReplayerEvents } = win.rrweb;
        const evs = win.events.slice();
        evs.push({
          type: 5,
          data: { tag: 'stall-marker', payload: {} },
          timestamp: win.events[0].timestamp + markerOffset,
        } as (typeof evs)[0]);
        const replayer = new Replayer(evs, { speed: 4 });
        replayer.addStallController({
          registerEvent() {},
          isStallMarker(e) {
            return e.type === 5 && e.data.tag === 'stall-marker';
          },
          stallOnPlay() {
            return false;
          },
          stallOnPause() {
            return false;
          },
        });
        const timeout = setTimeout(
          () => reject(new Error('never stalled')),
          5000,
        );
        replayer.on(ReplayerEvents.StallStart, () => {
          clearTimeout(timeout);
          resolve({
            stalled: replayer.isStalled(),
            isPlaying: replayer.isPlaying(),
            currentTime: replayer.getCurrentTime(),
          });
        });
        replayer.play(0);
      });
    }, 2500);

    expect(result).toMatchObject({ stalled: true, isPlaying: true });
    expect(
      (result as { currentTime: number }).currentTime,
    ).toBeGreaterThanOrEqual(2500);
    expect((result as { currentTime: number }).currentTime).toBeLessThan(3000);
  });

  it('glides past a stall marker that is resolved while still playing', async () => {
    const result = await page.evaluate((markerOffset) => {
      return new Promise((resolve, reject) => {
        const win = window as IWindow;
        const { Replayer, ReplayerEvents } = win.rrweb;
        const evs = win.events.slice();
        evs.push({
          type: 5,
          data: { tag: 'stall-marker', payload: {} },
          timestamp: win.events[0].timestamp + markerOffset,
        } as (typeof evs)[0]);
        const replayer = new Replayer(evs, { speed: 4 });
        let resolved = false;
        let stallStarted = false;
        replayer.addStallController({
          registerEvent() {},
          isStallMarker(e) {
            return !resolved && e.type === 5 && e.data.tag === 'stall-marker';
          },
          stallOnPlay() {
            return false;
          },
          stallOnPause() {
            return false;
          },
        });
        replayer.on(ReplayerEvents.StallStart, () => {
          stallStarted = true;
        });
        const timeout = setTimeout(
          () => reject(new Error('never finished')),
          8000,
        );
        replayer.on(ReplayerEvents.Finish, () => {
          clearTimeout(timeout);
          resolve({
            stallStarted,
            finishedAt: replayer.getCurrentTime(),
          });
        });
        replayer.play(0);
        setTimeout(() => {
          resolved = true;
        }, 100);
      });
    }, 2500);

    expect(result).toMatchObject({ stallStarted: false });
    expect((result as { finishedAt: number }).finishedAt).toBeGreaterThan(2500);
  });

  it('glides past a stall marker that was spliced out of the events array', async () => {
    const result = await page.evaluate((markerOffset) => {
      return new Promise((resolve, reject) => {
        const win = window as IWindow;
        const { Replayer, ReplayerEvents } = win.rrweb;
        const marker = {
          type: 5,
          data: { tag: 'stall-marker', payload: {} },
          timestamp: win.events[0].timestamp + markerOffset,
        } as (typeof win.events)[0];
        const evs = win.events.slice();
        evs.push(marker);
        const replayer = new Replayer(evs, { speed: 4 });
        replayer.addStallController({
          registerEvent() {},
          isStallMarker(e) {
            return e.type === 5 && e.data.tag === 'stall-marker';
          },
          stallOnPlay() {
            return false;
          },
          stallOnPause() {
            return false;
          },
        });
        let stallStarted = false;
        replayer.on(ReplayerEvents.StallStart, () => {
          stallStarted = true;
        });
        const timeout = setTimeout(
          () => reject(new Error('never finished')),
          8000,
        );
        replayer.on(ReplayerEvents.Finish, () => {
          clearTimeout(timeout);
          resolve({
            stallStarted,
            finishedAt: replayer.getCurrentTime(),
          });
        });
        replayer.play(0);
        setTimeout(() => {
          const live = replayer.events;
          live.splice(live.indexOf(marker), 1);
        }, 100);
      });
    }, 2500);

    expect(result).toMatchObject({ stallStarted: false });
    expect((result as { finishedAt: number }).finishedAt).toBeGreaterThan(2500);
  });

  it('addEvent during a seek-stall never clears it implicitly', async () => {
    const result = await page.evaluate((stallAt) => {
      const win = window as IWindow;
      const { Replayer, ReplayerEvents } = win.rrweb;
      const replayer = new Replayer(win.events, {});
      let held = true;
      let stallChecks = 0;
      const stallIfHeld = (timeOffset: number) => {
        stallChecks += 1;
        if (!held || timeOffset !== stallAt) return false;
        if (!replayer.isStalled()) replayer.stall();
        return true;
      };
      replayer.addStallController({
        registerEvent() {},
        isStallMarker(e) {
          return e.type === 5 && e.data.tag === 'stall-marker';
        },
        stallOnPlay: stallIfHeld,
        stallOnPause: stallIfHeld,
      });
      let stallEndCount = 0;
      replayer.on(ReplayerEvents.StallEnd, () => {
        stallEndCount += 1;
      });
      replayer.pause(stallAt);

      replayer.addEvent({
        type: 5,
        data: { tag: 'behind-target', payload: {} },
        timestamp: win.events[0].timestamp + 1500,
      } as (typeof win.events)[0]);
      replayer.addEvent({
        type: 5,
        data: { tag: 'stall-marker', payload: {} },
        timestamp: win.events[0].timestamp + 3500,
      } as (typeof win.events)[0]);
      const afterBehind = {
        stalled: replayer.isStalled(),
        isPaused: replayer.isPaused(),
        stallEndCount,
        stallChecks,
        currentTime: replayer.getCurrentTime(),
      };

      replayer.addEvent({
        type: 5,
        data: { tag: 'past-target', payload: {} },
        timestamp: win.events[0].timestamp + 3200,
      } as (typeof win.events)[0]);
      const afterPast = {
        stalled: replayer.isStalled(),
        isPaused: replayer.isPaused(),
        stallChecks,
        currentTime: replayer.getCurrentTime(),
      };

      held = false;
      replayer.clearStall();
      const afterClear = {
        stalled: replayer.isStalled(),
        isPaused: replayer.isPaused(),
        currentTime: replayer.getCurrentTime(),
      };

      return { afterBehind, afterPast, afterClear };
    }, 3000);

    expect(result.afterBehind).toEqual({
      stalled: true,
      isPaused: true,
      stallEndCount: 0,
      stallChecks: 1,
      currentTime: 3000,
    });
    expect(result.afterPast).toEqual({
      stalled: true,
      isPaused: true,
      stallChecks: 1,
      currentTime: 3000,
    });
    expect(result.afterClear).toEqual({
      stalled: false,
      isPaused: true,
      currentTime: 3000,
    });
  });

  it('an explicit stall survives addEvent; the caller clears it to resume', async () => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const win = window as IWindow;
        const { Replayer } = win.rrweb;
        const replayer = new Replayer(win.events, { speed: 4 });
        replayer.play(0);
        setTimeout(() => {
          replayer.stall();
          const stalledAt = replayer.getCurrentTime();
          replayer.addEvent({
            type: 5,
            data: { tag: 'late-arrival', payload: {} },
            timestamp: win.events[0].timestamp + 5000,
          } as (typeof win.events)[0]);
          const afterAdd = {
            stalled: replayer.isStalled(),
            time: replayer.getCurrentTime(),
          };
          replayer.clearStall();
          resolve({
            stalledAt,
            afterAdd,
            resumed: {
              stalled: replayer.isStalled(),
              isPlaying: replayer.isPlaying(),
              time: replayer.getCurrentTime(),
            },
          });
        }, 150);
      });
    });

    const r = result as {
      stalledAt: number;
      afterAdd: { stalled: boolean; time: number };
      resumed: { stalled: boolean; isPlaying: boolean; time: number };
    };
    expect(r.afterAdd.stalled).toBe(true);
    expect(r.afterAdd.time).toBe(r.stalledAt);
    expect(r.resumed.stalled).toBe(false);
    expect(r.resumed.isPlaying).toBe(true);
    expect(Math.abs(r.resumed.time - r.stalledAt)).toBeLessThan(100);
  });
});
