import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
  type actionWithDelay,
  type eventWithTime,
} from '@rrweb/types';
import { Replayer } from '../../src/replay';
import {
  SmoothReplay,
  cursorAt,
  drawTaperedTrail,
  findNextScroll,
  glideAt,
  haloScale,
  queueSamples,
  seedSample,
  REST_GAP_MS,
  smoothSpeed,
  TRAVEL_MS,
} from '../../src/replay/smooth';

const s = (t: number, x: number, y = 0, id = 1) => ({ t, x, y, id });

describe('cursorAt', () => {
  it('returns null before the first sample and holds after the last', () => {
    expect(cursorAt([s(100, 1)], 50)).toBeNull();
    expect(cursorAt([s(100, 1)], 500)).toMatchObject({ x: 1 });
  });

  it('passes through samples and curves between them', () => {
    const samples = [s(0, 0), s(50, 10), s(100, 20, 10), s(150, 30)];
    expect(cursorAt(samples, 50)!.x).toBeCloseTo(10);
    expect(cursorAt(samples, 100)!.x).toBeCloseTo(20);
    const mid = cursorAt(samples, 75)!;
    expect(mid.x).toBeCloseTo(15);
    expect(mid.y).toBeGreaterThan(0);
    expect(mid.y).toBeLessThan(10);
  });

  it('holds still across a rest gap, then glides in the last TRAVEL_MS', () => {
    const samples = [s(0, 0), s(1000, 100)];
    expect(cursorAt(samples, 500)!.x).toBe(0);
    expect(cursorAt(samples, 1000 - TRAVEL_MS)!.x).toBe(0);
    expect(cursorAt(samples, 1000 - TRAVEL_MS / 2)!.x).toBeCloseTo(50);
    expect(cursorAt(samples, 999)!.x).toBeGreaterThan(99);
  });

  it('blends across targets unless sameSpace rejects the pair', () => {
    const samples = [s(0, 0, 0, 1), s(100, 50, 0, 2)];
    expect(cursorAt(samples, 50)!.x).toBe(25);
    expect(cursorAt(samples, 50, (a, b) => a.id === b.id)!.x).toBe(0);
  });

  it('reproduces constant velocity exactly despite uneven sample spacing', () => {
    const samples = [0, 50, 120, 170, 250, 300].map((t) => s(t, t, 2 * t));
    for (let t = 0; t <= 300; t += 7) {
      expect(cursorAt(samples, t)!.x).toBeCloseTo(t, 6);
      expect(cursorAt(samples, t)!.y).toBeCloseTo(2 * t, 6);
    }
  });

  it('uses only neighbours closer than REST_GAP_MS as spline control points', () => {
    const far = [s(0, -1000), s(REST_GAP_MS + 1, 0), s(REST_GAP_MS + 51, 10)];
    expect(cursorAt(far, REST_GAP_MS + 26)!.x).toBeCloseTo(5);
  });
});

describe('queueSamples', () => {
  it('keeps the buffer sorted when batches overlap', () => {
    const buf = [s(100, 1), s(300, 3)];
    queueSamples(buf, [s(200, 2), s(400, 4)]);
    expect(buf.map((p) => p.t)).toEqual([100, 200, 300, 400]);
    queueSamples(buf, [s(500, 5)]);
    expect(buf.map((p) => p.t)).toEqual([100, 200, 300, 400, 500]);
  });
});

describe('seedSample', () => {
  it('replaces the past and keeps queued future samples', () => {
    const buf = [s(300, 3), s(400, 4)];
    seedSample(buf, s(250, 2));
    seedSample(buf, s(280, 3));
    expect(buf.map((p) => p.t)).toEqual([280, 300, 400]);
  });
});

describe('glideAt', () => {
  it('interpolates linearly and reports completion', () => {
    const g = { fx: 0, fy: 0, tx: 100, ty: 200, t0: 1000, t1: 1200 };
    expect(glideAt(g, 1100)).toEqual({ x: 50, y: 100, done: false });
    expect(glideAt(g, 1300)).toEqual({ x: 100, y: 200, done: true });
    expect(glideAt(g, 900).x).toBe(0);
  });
});

describe('findNextScroll', () => {
  const scroll = (timestamp: number, id: number, y: number): eventWithTime => ({
    type: EventType.IncrementalSnapshot,
    timestamp,
    data: { source: IncrementalSource.Scroll, id, x: 0, y },
  });
  const events = [
    scroll(0, 1, 0),
    scroll(100, 2, 5),
    scroll(300, 1, 50),
    scroll(1000, 1, 90),
  ];

  it('finds the next scroll on the same target within the gap', () => {
    expect(findNextScroll(events, events[0], 1)).toBe(events[2]);
    expect(findNextScroll(events, events[2], 1)).toBeNull();
    expect(findNextScroll(events, events[1], 2)).toBeNull();
  });
});

describe('drawTaperedTrail', () => {
  it('widens each segment linearly up to the head width', () => {
    const widths: number[] = [];
    const ctx = {
      lineWidth: 0,
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {
        widths.push(this.lineWidth);
      },
    };
    drawTaperedTrail(ctx, [s(0, 0), s(1, 1), s(2, 2), s(3, 3)], 3);
    expect(widths.map((w) => +w.toFixed(2))).toEqual([1.3, 2.6, 3.9]);
    widths.length = 0;
    drawTaperedTrail(ctx, [s(0, 0)], 3);
    expect(widths).toEqual([]);
  });
});

describe('halo', () => {
  it('is full at rest and shrinks with speed, floored at 0.2', () => {
    expect(haloScale(0)).toBe('1.00');
    expect(haloScale(1)).toBe('0.25');
    expect(haloScale(10)).toBe('0.20');
  });

  it('smooths speed, recovering faster than it rises', () => {
    expect(smoothSpeed(0, 1)).toBe(0.3);
    expect(smoothSpeed(1, 0)).toBe(0.5);
  });
});

const click = (timestamp: number, id: number, x: number): eventWithTime => ({
  type: EventType.IncrementalSnapshot,
  timestamp,
  data: {
    source: IncrementalSource.MouseInteraction,
    type: MouseInteractions.Click,
    id,
    x,
    y: 0,
  },
});
const move = (
  timestamp: number,
  id: number,
  x: number,
  earlier: Array<{ x: number; timeOffset: number }> = [],
): eventWithTime => ({
  type: EventType.IncrementalSnapshot,
  timestamp,
  data: {
    source: IncrementalSource.MouseMove,
    positions: [...earlier, { x, timeOffset: 0 }].map((p) => ({
      ...p,
      id,
      y: 0,
    })),
  },
});
const scrollTo = (timestamp: number, id: number, y: number): eventWithTime => ({
  type: EventType.IncrementalSnapshot,
  timestamp,
  data: { source: IncrementalSource.Scroll, id, x: 0, y },
});

/** A SmoothReplay on a stand-in replayer whose clock and frames the test drives. */
function harness(events: eventWithTime[], config: object) {
  let frame: FrameRequestCallback = () => undefined;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frame = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  const handlers: Record<string, Array<(e: unknown) => void>> = {};
  const doc = {};
  const nodes = new Map<number, object>();
  const replayer = {
    config,
    service: {
      state: {
        context: { events, baselineTime: 0 },
        matches: (s: string) => s === 'playing',
      },
    },
    timer: {
      timeOffset: 0,
      actions: [] as actionWithDelay[],
      addAction(a: actionWithDelay) {
        this.actions.push(a);
      },
    },
    iframe: {},
    getMirror: () => ({ getNode: (id: number) => nodes.get(id) ?? null }),
    on(name: string, h: (e: unknown) => void) {
      (handlers[name] ??= []).push(h);
    },
  };
  const mouse = {
    classList: { toggle: () => undefined },
    style: { left: '', top: '', setProperty: () => undefined },
  };
  const smooth = new SmoothReplay(
    replayer as unknown as Replayer,
    mouse as unknown as HTMLElement,
    () => undefined,
  );
  return {
    smooth,
    nodes,
    element: () => ({ ownerDocument: doc, scrollTo: vi.fn() }),
    setTime(t: number) {
      replayer.timer.timeOffset = t;
    },
    frameAt(t: number) {
      replayer.timer.timeOffset = t;
      frame(0);
    },
    /** Runs the timer actions due by t, as the replayer's timer would. */
    runActions(t: number) {
      replayer.timer.timeOffset = t;
      const { actions } = replayer.timer;
      actions.sort((a, b) => a.delay - b.delay);
      while (actions.length && actions[0].delay <= t)
        actions.shift()!.doAction();
    },
    emit(name: ReplayerEvents) {
      handlers[name].forEach((h) => h(undefined));
    },
    cast(e: eventWithTime, at = e.timestamp) {
      replayer.timer.timeOffset = at;
      handlers['event-cast'].forEach((h) => h(e));
    },
    left: () => parseFloat(mouse.style.left),
  };
}

describe('SmoothReplay', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps gliding from a reached sample after its target is removed', () => {
    const h = harness([click(1000, 2, 100), move(1200, 3, 200)], {
      cursor: { smooth: true },
    });
    h.nodes.set(2, h.element());
    h.nodes.set(3, h.element());
    h.frameAt(1000);
    expect(h.left()).toBe(100);
    h.nodes.delete(2);
    h.frameAt(1050);
    const before = h.left();
    expect(before).toBeGreaterThan(100);
    h.emit(ReplayerEvents.Pause);
    h.setTime(1100);
    h.emit(ReplayerEvents.Start);
    h.frameAt(1150);
    expect(h.left()).toBeGreaterThan(before);
    expect(h.left()).toBeLessThan(200);
  });

  it('keeps gliding when a click target is removed before the next frame', () => {
    const events = [click(1000, 2, 100), move(1200, 3, 200)];
    const h = harness(events, { cursor: { smooth: true } });
    h.nodes.set(2, h.element());
    h.nodes.set(3, h.element());
    h.cast(events[0]);
    h.nodes.delete(2);
    h.frameAt(1100);
    expect(h.left()).toBeGreaterThan(120);
    expect(h.left()).toBeLessThan(180);
  });

  it('glides the cursor toward a sample added before its cast', () => {
    const events = [click(1000, 2, 100)];
    const h = harness(events, { cursor: { smooth: true } });
    h.nodes.set(2, h.element());
    h.frameAt(1000);
    h.setTime(1100);
    const added = move(1200, 2, 200);
    events.push(added);
    h.smooth.added(added);
    h.frameAt(1150);
    expect(h.left()).toBeGreaterThan(130);
    expect(h.left()).toBeLessThan(200);
  });

  it('extends the current scroll glide to a scroll added before its cast', () => {
    const events = [scrollTo(1000, 5, 0)];
    const h = harness(events, { smoothScroll: true });
    const el = h.element();
    h.nodes.set(5, el);
    h.cast(events[0]);
    h.setTime(1100);
    const added = scrollTo(1200, 5, 200);
    events.push(added);
    h.smooth.added(added);
    h.frameAt(1150);
    expect(el.scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ top: 150 }),
    );
  });
});

describe('SmoothReplay in a nested iframe', () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A target inside an iframe whose left edge the test can move. */
  const framed = () => {
    const frame = {
      left: 300,
      clientHeight: 100,
      ownerDocument: {},
      getBoundingClientRect() {
        return { x: this.left, y: 0, height: 100 };
      },
    };
    return {
      frame,
      node: { ownerDocument: { defaultView: { frameElement: frame } } },
    };
  };

  it('measures each sample of a move batch at its own move', () => {
    const batch = move(1100, 3, 20, [{ x: 0, timeOffset: -100 }]);
    const h = harness([batch], { cursor: { smooth: true } });
    const { frame, node } = framed();
    h.nodes.set(3, node);
    h.cast(batch, 1000);
    h.frameAt(1000);
    expect(h.left()).toBe(300);
    frame.left = 100; // the parent page scrolls the iframe
    h.runActions(1100);
    h.frameAt(1100);
    expect(h.left()).toBe(120);
  });

  it('measures samples again after a seek back', () => {
    const events = [click(1000, 3, 0), click(1200, 3, 50)];
    const h = harness(events, { cursor: { smooth: true } });
    const { frame, node } = framed();
    h.nodes.set(3, node);
    h.frameAt(1000);
    expect(h.left()).toBe(300);
    h.frameAt(1300);
    frame.left = 100;
    h.setTime(900);
    h.emit(ReplayerEvents.Start);
    h.frameAt(1000);
    expect(h.left()).toBe(100);
  });
});

describe('Replayer', () => {
  const applyScroll = (config: object, isSync: boolean) => {
    const target = { scrollTo: vi.fn() };
    const fake = {
      config,
      iframe: {},
      mirror: { getNode: () => target, getMeta: () => null },
    };
    (
      Replayer.prototype as unknown as {
        applyScroll(d: unknown, isSync: boolean): void;
      }
    ).applyScroll.call(fake, { id: 6, x: 0, y: 10 }, isSync);
    return target.scrollTo.mock.calls[0][0].behavior;
  };

  it('scrolls as it did before smoothScroll unless smoothScroll is set', () => {
    expect(applyScroll({}, true)).toBe('auto');
    expect(applyScroll({}, false)).toBe('smooth');
    expect(applyScroll({ smoothScroll: true }, true)).toBe('instant');
    expect(applyScroll({ smoothScroll: true }, false)).toBe('instant');
  });

  it('passes added events to the smoothing after the player takes them', async () => {
    const order: string[] = [];
    const fake = {
      config: {},
      mouse: { classList: { add: () => undefined } },
      service: { send: () => order.push('send') },
      smooth: { added: () => order.push('added') },
    };
    Replayer.prototype.addEvent.call(fake, move(1200, 2, 200));
    await Promise.resolve();
    expect(order).toEqual(['send', 'added']);
  });
});
