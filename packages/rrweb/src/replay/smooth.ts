import {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from '@rrweb/types';
import type {
  DocumentDimension,
  eventWithTime,
  fullSnapshotEvent,
  scrollData,
} from '@rrweb/types';
import { getBaseDimension } from '../utils';
import type { Replayer } from './index';

export type CursorSample = {
  t: number;
  x: number;
  y: number;
  id: number;
  /** The pointer was placed here rather than moved here; never blend into it. */
  jump?: boolean;
};
export type ScrollGlide = {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t0: number;
  t1: number;
};

/** Gap between samples beyond which the cursor is treated as resting. */
export const REST_GAP_MS = 250;
/** Time a resting cursor takes to reach the next sample. */
export const TRAVEL_MS = 140;
/** Scroll samples further apart than this are not interpolated. */
export const SCROLL_GLIDE_MAX_GAP_MS = 400;
/** How often drifted scroll positions are re-applied. */
export const SCROLL_GUARD_MS = 200;
/** Trail width at the cursor, relative to the configured mouseTail lineWidth. */
export const TRAIL_HEAD_SCALE = 1.3;

/** Smoothed cursor speed; falls faster than it rises so the halo recovers quickly. */
export const smoothSpeed = (prev: number, v: number) =>
  prev + (v - prev) * (v < prev ? 0.5 : 0.3);

/** Cursor halo scale for a speed in px/ms: 1 at rest, shrinking towards 0.2. */
export const haloScale = (v: number) =>
  Math.max(0.2, 1 / (1 + 3 * v)).toFixed(2);

/** Cubic Hermite from p1 to p2 with tangents m1, m2 already scaled to the segment. */
const hermite = (p1: number, p2: number, m1: number, m2: number, u: number) => {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * p1 +
    (u3 - 2 * u2 + u) * m1 +
    (3 * u2 - 2 * u3) * p2 +
    (u3 - u2) * m2
  );
};

const easeInOut = (u: number) =>
  u < 0.5 ? 2 * u * u : 1 - ((2 - 2 * u) * (2 - 2 * u)) / 2;

/**
 * Interpolated cursor position at time t from samples sorted by t. Samples are
 * only blended when `sameSpace` says their coordinates are comparable.
 */
export function cursorAt(
  s: CursorSample[],
  t: number,
  sameSpace: (a: CursorSample, b: CursorSample) => boolean = () => true,
): CursorSample | null {
  if (!s.length || t < s[0].t) return null;
  let lo = 0;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  const a = s[lo];
  const b = s[lo + 1];
  if (!b || !sameSpace(a, b)) return a;
  const dt = b.t - a.t;
  if (dt > REST_GAP_MS) {
    const leave = b.t - TRAVEL_MS;
    if (t < leave) return a;
    const u = easeInOut((t - leave) / TRAVEL_MS);
    return { ...a, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }
  if (!dt) return b;
  const u = (t - a.t) / dt;
  const p = s[lo - 1];
  const n = s[lo + 2];
  // Velocities at a and b from the neighbouring samples, so uneven sample
  // spacing does not turn into speed changes along the path.
  const p0 = p && sameSpace(p, a) && a.t - p.t <= REST_GAP_MS ? p : a;
  const p3 = n && sameSpace(b, n) && n.t - b.t <= REST_GAP_MS ? n : b;
  const vx1 = ((b.x - p0.x) / (b.t - p0.t)) * dt;
  const vy1 = ((b.y - p0.y) / (b.t - p0.t)) * dt;
  const vx2 = ((p3.x - a.x) / (p3.t - a.t)) * dt;
  const vy2 = ((p3.y - a.y) / (p3.t - a.t)) * dt;
  return {
    ...a,
    x: hermite(a.x, b.x, vx1, vx2, u),
    y: hermite(a.y, b.y, vy1, vy2, u),
  };
}

/** Appends samples to a buffer sorted by t, re-sorting only when batches overlap. */
export function queueSamples(s: CursorSample[], add: CursorSample[]) {
  const n = s.length;
  s.push(...add);
  if (n && add.length && s[n - 1].t > s[n].t) s.sort((a, b) => a.t - b.t);
}

/** Replaces every sample at or before sample.t with it, so a seek starts from where the pointer was. */
export function seedSample(s: CursorSample[], sample: CursorSample) {
  let i = 0;
  while (i < s.length && s[i].t <= sample.t) i++;
  s.splice(0, i, sample);
}

export function glideAt(g: ScrollGlide, t: number) {
  const u = Math.min(1, Math.max(0, (t - g.t0) / (g.t1 - g.t0 || 1)));
  return {
    x: g.fx + (g.tx - g.fx) * u,
    y: g.fy + (g.ty - g.fy) * u,
    done: u >= 1,
  };
}

/** Next scroll event on the same target within SCROLL_GLIDE_MAX_GAP_MS, or null. */
export function findNextScroll(
  events: eventWithTime[],
  e: eventWithTime,
  id: number,
): (eventWithTime & { data: scrollData }) | null {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].timestamp <= e.timestamp) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < events.length; i++) {
    const n = events[i];
    if (n.timestamp - e.timestamp > SCROLL_GLIDE_MAX_GAP_MS) break;
    if (
      n.type === EventType.IncrementalSnapshot &&
      n.data.source === IncrementalSource.Scroll &&
      n.data.id === id
    )
      return n as eventWithTime & { data: scrollData };
  }
  return null;
}

/** Strokes pts as segments whose width grows from 0 at pts[0] to TRAIL_HEAD_SCALE * lineWidth at the last point. */
export function drawTaperedTrail(
  ctx: Pick<
    CanvasRenderingContext2D,
    'beginPath' | 'moveTo' | 'lineTo' | 'stroke'
  > & { lineWidth: number },
  pts: Array<{ x: number; y: number }>,
  lineWidth: number,
) {
  const headWidth = lineWidth * TRAIL_HEAD_SCALE;
  const last = pts.length - 1;
  for (let i = 1; i <= last; i++) {
    ctx.beginPath();
    ctx.lineWidth = (headWidth * i) / last;
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}

const cursorSamples = (e: eventWithTime): CursorSample[] => {
  if (e.type !== EventType.IncrementalSnapshot) return [];
  const d = e.data;
  if ('positions' in d)
    return d.positions
      .filter((p) => p.id !== -1)
      .map((p) => ({
        t: e.timestamp + p.timeOffset,
        x: p.x,
        y: p.y,
        id: p.id,
      }));
  if (
    d.source === IncrementalSource.MouseInteraction &&
    d.id !== -1 &&
    typeof d.x === 'number' &&
    typeof d.y === 'number'
  )
    return [
      {
        t: e.timestamp,
        x: d.x,
        y: d.y,
        id: d.id,
        jump: d.type === MouseInteractions.TouchStart,
      },
    ];
  return [];
};

/**
 * Drives the smoothCursor and smoothScroll options from the replayer's events:
 * rebuilds its state on Start, follows casts after that, and moves the cursor
 * and scroll offsets every animation frame while playing.
 */
export class SmoothReplay {
  private samples: CursorSample[] = [];
  private glides = new Map<number, ScrollGlide>();
  private desired = new Map<number, { x: number; y: number }>();
  private raf: number | null = null;
  private lastGuard = 0;
  private last = { x: NaN, y: NaN, t: NaN };
  private speed = 0;
  /** Iframe offset of each sample, measured when the cursor reaches it. */
  private bases = new WeakMap<CursorSample, DocumentDimension>();
  /** Pointer events read by seed(); any other cast is newly added. */
  private seen = new WeakSet<eventWithTime>();
  private live = false;
  private cursorOn = false;
  private scrollOn = false;

  constructor(
    private replayer: Replayer,
    private mouse: HTMLElement,
    private drawTrail: (p: { x: number; y: number }) => void,
  ) {
    replayer.on(ReplayerEvents.Start, () => this.seed());
    replayer.on(ReplayerEvents.Pause, () => this.stop());
    replayer.on(ReplayerEvents.Finish, () => this.stop());
    replayer.on(ReplayerEvents.Destroy, () => this.stop());
    replayer.on(ReplayerEvents.StateChange, (s) => {
      const p = (s as { player?: { matches(v: string): boolean } }).player;
      if (!p) return;
      const live = p.matches('live');
      if (live && !this.live) this.seed();
      this.live = live;
    });
    replayer.on(ReplayerEvents.FullsnapshotRebuilded, (e) => {
      if (this.scrollOn) this.trackSnapshot(e as fullSnapshotEvent);
    });
    replayer.on(ReplayerEvents.EventCast, (e) =>
      this.trackCast(e as eventWithTime),
    );
    this.configure();
  }

  /** Applies the replayer config; a no-op unless an option changed. */
  configure() {
    const { smoothCursor = false, smoothScroll = false } = this.replayer.config;
    if (smoothCursor === this.cursorOn && smoothScroll === this.scrollOn)
      return;
    this.cursorOn = smoothCursor;
    this.scrollOn = smoothScroll;
    this.mouse.classList.toggle('smooth', smoothCursor);
    const { state } = this.replayer.service;
    if (state.matches('playing') || state.matches('live')) this.seed();
    else this.stop();
  }

  private get enabled() {
    return this.cursorOn || this.scrollOn;
  }

  private now() {
    const { baselineTime } = this.replayer.service.state.context;
    return baselineTime + this.replayer.timer.timeOffset;
  }

  /** Rebuilds samples and scroll state from the events at the current time, then runs. */
  private seed() {
    if (!this.enabled) return this.stop();
    const { events } = this.replayer.service.state.context;
    const now = this.now();
    this.samples.length = 0;
    this.glides.clear();
    this.desired.clear();
    // The first snapshot is already on screen as the poster, even before its time.
    let poster = true;
    for (const e of events) {
      const past = e.timestamp <= now;
      if (e.type === EventType.FullSnapshot) {
        if (this.scrollOn && (past || poster)) this.trackSnapshot(e);
        poster = false;
      } else if (
        e.type === EventType.IncrementalSnapshot &&
        e.data.source === IncrementalSource.Scroll
      ) {
        if (this.scrollOn && past) this.trackScroll(e, e.data);
      } else if (this.cursorOn) {
        const add = cursorSamples(e);
        if (!add.length) continue;
        this.seen.add(e);
        if (past) seedSample(this.samples, add[add.length - 1]);
        else queueSamples(this.samples, add);
      }
    }
    this.start();
  }

  private trackCast(e: eventWithTime) {
    if (e.type !== EventType.IncrementalSnapshot) return;
    if (e.data.source === IncrementalSource.Scroll) {
      if (this.scrollOn) this.trackScroll(e, e.data);
    } else if (this.cursorOn && !this.seen.has(e))
      queueSamples(this.samples, cursorSamples(e));
  }

  private trackSnapshot(e: fullSnapshotEvent) {
    this.glides.clear();
    this.desired.clear();
    const { left: x, top: y } = e.data.initialOffset;
    this.desired.set(e.data.node.id, { x, y });
  }

  private trackScroll(e: eventWithTime, d: scrollData) {
    this.desired.set(d.id, { x: d.x, y: d.y });
    const next = findNextScroll(
      this.replayer.service.state.context.events,
      e,
      d.id,
    );
    if (next)
      this.glides.set(d.id, {
        fx: d.x,
        fy: d.y,
        tx: next.data.x,
        ty: next.data.y,
        t0: e.timestamp,
        t1: next.timestamp,
      });
    else this.glides.delete(d.id);
  }

  private scroller(id: number) {
    const n = this.replayer.getMirror().getNode(id) as
      | Document
      | Element
      | null;
    const win = (n as Document | null)?.defaultView;
    return win === undefined ? (n as Element | null) : win;
  }

  private getScroll(id: number) {
    const t = this.scroller(id);
    if (!t) return null;
    return 'scrollX' in t
      ? { x: t.scrollX, y: t.scrollY }
      : { x: t.scrollLeft, y: t.scrollTop };
  }

  private setScroll(id: number, x: number, y: number) {
    try {
      this.scroller(id)?.scrollTo({ left: x, top: y, behavior: 'instant' });
    } catch {
      // the target may have been removed before its last scroll
    }
  }

  private start() {
    this.stop();
    if (this.enabled) this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private frame = () => {
    this.raf = requestAnimationFrame(this.frame);
    const t = this.now();
    if (this.cursorOn) this.stepCursor(t);
    if (this.scrollOn) this.stepScroll(t);
  };

  private stepCursor(t: number) {
    const s = this.samples;
    while (s.length > 2 && s[2].t <= t) s.shift();
    const p = cursorAt(s, t, this.sameDocument);
    const target = p && this.replayer.getMirror().getNode(p.id);
    if (!p || !target) return;
    // Measured once per sample, as moveAndHover does: a still pointer stays
    // put when the page scrolls a nested iframe under it.
    const reached = s[1] && s[1].t <= t ? s[1] : s[0];
    let base = this.bases.get(reached);
    if (!base) {
      base = getBaseDimension(target, this.replayer.iframe);
      this.bases.set(reached, base);
    }
    const x = p.x * base.absoluteScale + base.x;
    const y = p.y * base.absoluteScale + base.y;
    const last = this.last;
    if (t > last.t) {
      const v = Math.hypot(x - last.x, y - last.y) / (t - last.t);
      this.speed = smoothSpeed(this.speed, v);
      this.mouse.style.setProperty('--rr-cursor-scale', haloScale(this.speed));
    }
    if (x !== last.x || y !== last.y) {
      this.mouse.style.left = `${x}px`;
      this.mouse.style.top = `${y}px`;
      this.drawTrail({ x, y });
    }
    this.last = { x, y, t };
  }

  /**
   * Recorded positions are viewport coordinates of the document they were
   * captured in, so only positions from the same document can be blended.
   */
  private sameDocument = (a: CursorSample, b: CursorSample) => {
    const mirror = this.replayer.getMirror();
    return (
      !b.jump &&
      (a.id === b.id ||
        mirror.getNode(a.id)?.ownerDocument ===
          mirror.getNode(b.id)?.ownerDocument)
    );
  };

  private stepScroll(t: number) {
    for (const [id, g] of this.glides) {
      const { x, y, done } = glideAt(g, t);
      this.setScroll(id, x, y);
      if (done) this.glides.delete(id);
    }
    const now = performance.now();
    if (now - this.lastGuard < SCROLL_GUARD_MS) return;
    this.lastGuard = now;
    for (const [id, want] of this.desired) {
      const cur = this.glides.has(id) ? null : this.getScroll(id);
      if (cur && (Math.abs(cur.x - want.x) > 1 || Math.abs(cur.y - want.y) > 1))
        this.setScroll(id, want.x, want.y);
    }
  }
}
