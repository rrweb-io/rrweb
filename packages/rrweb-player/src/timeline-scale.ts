/** [start, end) in milliseconds from the first event of the recording. */
export type IdleInterval = readonly [number, number];
/** One stretch of the timeline: `start`/`end` in recording milliseconds,
 * `left`/`right` as fractions of the drawn width (0 to 1). */
export type TimelineSpan = {
  start: number;
  end: number;
  idle: boolean;
  left: number;
  right: number;
};
/** The one mapping between recording time and drawn position. Everything on
 * a timeline (track, playhead, markers, activity graph) must share one. */
export type ReplayTimelineScale = ReturnType<typeof createReplayTimelineScale>;

/** The share of the timeline inactive periods take when compression is on. */
export const DEFAULT_MAX_IDLE_SHARE = 0.2;

/** Real milliseconds and display fractions remain separate, including inside idle gaps. */
export function createReplayTimelineScale(
  duration: number,
  intervals: readonly IdleInterval[],
  maxIdleShare = DEFAULT_MAX_IDLE_SHARE,
) {
  const total = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const cap = Number.isFinite(maxIdleShare)
    ? Math.max(0.001, Math.min(1, maxIdleShare))
    : DEFAULT_MAX_IDLE_SHARE;
  const merged: [number, number][] = [];
  for (const [start, end] of intervals
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .map(([a, b]): [number, number] => [Math.max(0, a), Math.min(total, b)])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  const inactive = merged.reduce((sum, [a, b]) => sum + b - a, 0);
  const active = total - inactive;
  // With no activity there is nothing to enlarge; retain a usable linear track.
  const idleShare =
    total === 0 ? 0 : active === 0 ? 1 : Math.min(inactive / total, cap);
  const spans: TimelineSpan[] = [];
  let cursor = 0;
  let position = 0;
  const append = (start: number, end: number, idle: boolean) => {
    if (end <= start) return;
    const width = idle
      ? ((end - start) / inactive) * idleShare
      : ((end - start) / active) * (1 - idleShare);
    spans.push({ start, end, idle, left: position, right: position + width });
    position += width;
  };
  for (const [start, end] of merged) {
    append(cursor, start, false);
    append(start, end, true);
    cursor = end;
  }
  append(cursor, total, false);
  if (spans.length) spans[spans.length - 1].right = 1;
  // A timeline that compresses nothing maps time linearly, exactly as the
  // classic timeline does, without the rounding of the span arithmetic.
  const linear = total > 0 && idleShare === inactive / total;
  const bound = (value: number, maximum: number) =>
    Number.isNaN(value) ? 0 : Math.max(0, Math.min(maximum, value));
  function map(value: number, inverse: boolean) {
    const point = bound(value, inverse ? 1 : total);
    if (!spans.length) return 0;
    if (linear) return inverse ? point * total : point / total;
    let low = 0,
      high = spans.length - 1;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if ((inverse ? spans[mid].right : spans[mid].end) < point) low = mid + 1;
      else high = mid;
    }
    const span = spans[low];
    const from = inverse ? span.left : span.start;
    const to = inverse ? span.right : span.end;
    const outFrom = inverse ? span.start : span.left;
    const outTo = inverse ? span.end : span.right;
    return outFrom + ((point - from) / (to - from)) * (outTo - outFrom);
  }
  return {
    total,
    idleShare,
    spans,
    timeToPosition: (time: number) => map(time, false),
    positionToTime: (fraction: number) => map(fraction, true),
  };
}
