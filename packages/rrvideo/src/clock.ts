/**
 * Runs in the player page. Replaces the timers the replayer uses with a clock
 * that only moves on `__clock.advance(ms)`, so each captured frame is exactly
 * one frame interval of playback however long the capture takes.
 * `Date` is left alone; the replayer only reads it in live mode.
 *
 * Inlined with toString(), so it must not reference anything outside itself
 * or use async/await (which compiles to a helper).
 */
export function installClock() {
  type Timer = { due: number; every: number; fn: () => void };
  const w = window as unknown as Record<string, unknown>;
  const realSetTimeout = setTimeout.bind(window);
  const timers = new Map<number, Timer>();
  let frames = new Map<number, FrameRequestCallback>();
  let now = performance.now();
  let lastId = 0;
  const run = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  };
  const addTimer = (every: boolean) =>
    function (fn: (...args: unknown[]) => void, ms = 0, ...args: unknown[]) {
      timers.set(++lastId, {
        due: now + ms,
        every: every ? Math.max(1, ms) : 0,
        fn: () => fn(...args),
      });
      return lastId;
    };
  const clear = (id: number) => timers.delete(id);

  performance.now = () => now;
  w.setTimeout = addTimer(false);
  w.setInterval = addTimer(true);
  w.clearTimeout = w.clearInterval = clear;
  w.requestAnimationFrame = (cb: FrameRequestCallback) => {
    frames.set(++lastId, cb);
    return lastId;
  };
  w.cancelAnimationFrame = (id: number) => frames.delete(id);

  w.__clock = {
    sleep: (ms: number) => new Promise((r) => realSetTimeout(r, ms)),
    // Fire due timers in order, yielding to microtasks between them as real
    // tasks would, then one round of animation frames.
    advance(ms: number): Promise<void> {
      const end = now + ms;
      const step = (): Promise<void> => {
        let next: [number, Timer] | undefined;
        for (const entry of timers) {
          const due = entry[1].due;
          if (due <= end && (!next || due < next[1].due)) next = entry;
        }
        if (!next) {
          now = end;
          const due = frames;
          frames = new Map();
          due.forEach((cb) => run(() => cb(now)));
          return Promise.resolve();
        }
        const [id, timer] = next;
        now = Math.max(now, timer.due);
        if (timer.every) timer.due += timer.every;
        else timers.delete(id);
        run(timer.fn);
        return Promise.resolve().then(step);
      };
      return step();
    },
  };
}
