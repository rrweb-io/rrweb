import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime, scrollData } from '@rrweb/types';

export type CursorSample = { t: number; x: number; y: number; id: number };
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

const catmullRom = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  u: number,
) =>
  0.5 *
  (2 * p1 +
    (p2 - p0) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
    (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);

const easeInOut = (u: number) =>
  u < 0.5 ? 2 * u * u : 1 - ((2 - 2 * u) * (2 - 2 * u)) / 2;

/** Interpolated cursor position at time t from samples sorted by t. */
export function cursorAt(s: CursorSample[], t: number): CursorSample | null {
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
  if (!b || b.id !== a.id) return a;
  const dt = b.t - a.t;
  if (dt > REST_GAP_MS) {
    const leave = b.t - TRAVEL_MS;
    if (t < leave) return a;
    const u = easeInOut((t - leave) / TRAVEL_MS);
    return { ...a, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }
  const u = dt ? (t - a.t) / dt : 1;
  const p = s[lo - 1];
  const n = s[lo + 2];
  const p0 = p && p.id === a.id && a.t - p.t <= REST_GAP_MS ? p : a;
  const p3 = n && n.id === a.id && n.t - b.t <= REST_GAP_MS ? n : b;
  return {
    ...a,
    x: catmullRom(p0.x, a.x, b.x, p3.x, u),
    y: catmullRom(p0.y, a.y, b.y, p3.y, u),
  };
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

/** Strokes pts as segments whose width grows from 0 at pts[0] to headWidth at the last point. */
export function drawTaperedTrail(
  ctx: Pick<
    CanvasRenderingContext2D,
    'beginPath' | 'moveTo' | 'lineTo' | 'stroke'
  > & { lineWidth: number },
  pts: Array<{ x: number; y: number }>,
  headWidth: number,
) {
  const last = pts.length - 1;
  for (let i = 1; i <= last; i++) {
    ctx.beginPath();
    ctx.lineWidth = (headWidth * i) / last;
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}
