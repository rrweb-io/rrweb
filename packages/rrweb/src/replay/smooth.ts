import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime, scrollData } from '@rrweb/types';

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
