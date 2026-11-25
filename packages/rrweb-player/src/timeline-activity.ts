import type { ReplayTimelineScale } from './timeline-scale';

export type ActivityEvent = { type: number; timestamp: number; data?: unknown };
/** What happened in one second of the recording. The four measures have
 * different units and are never added together. */
export type ActivityBucket = {
  /** Number of clicks. */
  clicks: number;
  /** Number of input events. Their values are never read. */
  inputs: number;
  /** Scroll distance in recorded pixels, summed over every scroller. */
  scroll: number;
  /** Pointer travel in recorded pixels: mouse moves, touch moves and drags. */
  mouse: number;
};
/** The graph reads `total`, `spans` and both mapping functions. */
export type ActivityScale = ReplayTimelineScale;

// rrweb wire values: IncrementalSnapshot is event type 3; its sources are
// MouseMove 1, MouseInteraction 2, Scroll 3, Input 5, TouchMove 6, Drag 12;
// a MouseInteraction of type 2 is a click.
const isClick = (event: ActivityEvent) => {
  const data = object(event.data);
  return event.type === 3 && data.source === 2 && data.type === 2;
};

/** Click times in milliseconds from the first event. The graph marks each
 * click at its exact time. A bucket's click count is not drawn; it only
 * tells the graph that a recording with nothing but clicks has activity. */
export function replayClickTimes(events: readonly ActivityEvent[]) {
  const start = events[0]?.timestamp ?? 0;
  return events.filter(isClick).map((event) => event.timestamp - start);
}

/** Times in milliseconds from the first event of Meta events (type 4) whose
 * URL differs from the previous Meta event's. rrweb writes a Meta event before
 * every full snapshot, including periodic checkouts, and records no flag that
 * tells a checkout from a page load, so a reload of the same URL is not shown.
 * A single-page app changes its URL without a Meta event, so such a change
 * shows at the next checkout, or not at all if the URL changes back first.
 * The first page needs no mark. */
export function replayNavigationTimes(events: readonly ActivityEvent[]) {
  const start = events[0]?.timestamp ?? 0;
  const times: number[] = [];
  let href: string | undefined;
  for (const event of events) {
    if (event.type !== 4) continue;
    const next = object(event.data).href;
    if (typeof next !== 'string') continue;
    if (href !== undefined && next !== href)
      times.push(event.timestamp - start);
    href = next;
  }
  return times;
}

/** Pointer samples further apart than this are separate movements; the
 * distance between them is not counted as travel. */
const POINTER_GAP_MS = 10_000;
/** The drawing has this many intervals, whatever the recording's length. */
const SAMPLE_INTERVALS = 600;
/** Clicks closer together than this fraction of the timeline's width share
 * one mark: about the width of a mark on a 1000 px timeline. */
const CLICK_MERGE_FRACTION = 0.008;
/** Half-width of the smoothing around each one-second bucket, in seconds. */
const BUCKET_RADIUS_S = 0.75;
/** Activity eases to zero over this fraction of the width beside an idle gap. */
const IDLE_EDGE_TAPER = 0.018;
const empty = (): ActivityBucket => ({
  clicks: 0,
  inputs: 0,
  scroll: 0,
  mouse: 0,
});
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Records where each serialized element is scrolled to. rrweb writes
 * rr_scrollLeft and rr_scrollTop only when they are not zero, so every other
 * element starts at the origin.
 */
function seedNestedScroll(
  root: Record<string, unknown>,
  scroll: Map<number, { x: number; y: number }>,
) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop()!;
    const attributes = object(node.attributes);
    const x = attributes.rr_scrollLeft;
    const y = attributes.rr_scrollTop;
    // Element nodes are type 2 in rrweb-snapshot.
    if (finite(node.id) && node.type === 2)
      scroll.set(node.id, { x: finite(x) ? x : 0, y: finite(y) ? y : 0 });
    // Document nodes (type 0), such as an attached iframe's, scroll by their
    // own id from the offset recorded on their scrolling element (the root
    // element, or the body in quirks mode), or from zero. A snapshot's own
    // document keeps its initialOffset.
    if (finite(node.id) && node.type === 0 && !scroll.has(node.id)) {
      const elementChild = (parent: Record<string, unknown>, tag?: string) =>
        object(
          (Array.isArray(parent.childNodes) ? parent.childNodes : [])
            .map(object)
            .find(
              (child) =>
                child.type === 2 &&
                (tag === undefined || child.tagName === tag),
            ),
        );
      const root = elementChild(node);
      const scroller =
        node.compatMode === 'BackCompat' ? elementChild(root, 'body') : root;
      const offset = object(scroller.attributes);
      scroll.set(node.id, {
        x: finite(offset.rr_scrollLeft) ? offset.rr_scrollLeft : 0,
        y: finite(offset.rr_scrollTop) ? offset.rr_scrollTop : 0,
      });
    }
    if (Array.isArray(node.childNodes))
      for (const child of node.childNodes) stack.push(object(child));
  }
}

/** Sparse, one-second buckets. Input text and checked values are never read. */
export function bucketReplayActivity(
  events: readonly ActivityEvent[],
  duration: number,
) {
  const buckets = new Map<number, ActivityBucket>();
  const start = events[0]?.timestamp ?? 0;
  const scroll = new Map<number, { x: number; y: number }>();
  const moves: Array<{ time: number; x: number; y: number }> = [];
  // Times at which pointer travel starts over: full snapshots, and touch
  // starts, ends and cancels, since the finger did not travel between them.
  // A start comes before samples at its own time and an end after them.
  const breaks: Array<{ time: number; end: boolean }> = [];
  const inRange = (time: number) =>
    finite(time) && time >= 0 && time <= duration;
  function bucket(time: number) {
    const second = Math.floor(time / 1000);
    let value = buckets.get(second);
    if (!value) {
      value = empty();
      buckets.set(second, value);
    }
    return value;
  }
  for (const event of events) {
    const data = object(event.data);
    if (event.type === 2) {
      breaks.push({ time: event.timestamp - start, end: false });
      scroll.clear();
      const node = object(data.node),
        offset = object(data.initialOffset);
      if (finite(node.id) && finite(offset.left) && finite(offset.top))
        scroll.set(node.id, { x: offset.left, y: offset.top });
      seedNestedScroll(node, scroll);
    }
    if (event.type !== 3) continue;
    const time = event.timestamp - start;
    if (
      data.source === 2 &&
      (data.type === 7 || data.type === 9 || data.type === 10)
    ) {
      breaks.push({ time, end: data.type !== 7 });
      // A touch starts where the finger lands, so the first move travels
      // from there.
      if (data.type === 7 && finite(data.x) && finite(data.y))
        moves.push({ time, x: data.x, y: data.y });
    }
    // Elements added later can scroll too.
    if (data.source === 0 && Array.isArray(data.adds))
      for (const add of data.adds)
        seedNestedScroll(object(object(add).node), scroll);
    if (data.source === 1 || data.source === 6 || data.source === 12) {
      if (!Array.isArray(data.positions)) continue;
      for (const raw of data.positions) {
        const point = object(raw);
        if (finite(point.x) && finite(point.y) && finite(point.timeOffset))
          moves.push({
            time: time + point.timeOffset,
            x: point.x,
            y: point.y,
          });
      }
      continue;
    }
    if (!inRange(time)) continue;
    if (isClick(event)) bucket(time).clicks++;
    if (data.source === 5) bucket(time).inputs++;
    if (
      data.source === 3 &&
      finite(data.id) &&
      finite(data.x) &&
      finite(data.y)
    ) {
      const previous = scroll.get(data.id);
      if (previous) {
        const distance = Math.hypot(data.x - previous.x, data.y - previous.y);
        if (finite(distance) && distance > 0) bucket(time).scroll += distance;
      }
      // No assumed origin for a nested scroller whose first offset is unknown.
      scroll.set(data.id, { x: data.x, y: data.y });
    }
  }
  moves.sort((a, b) => a.time - b.time);
  breaks.sort((a, b) => a.time - b.time || Number(a.end) - Number(b.end));
  let previous: (typeof moves)[number] | undefined;
  let nextBreak = 0;
  for (const point of moves) {
    if (!inRange(point.time)) continue;
    // Samples on either side of a break are not joined.
    let crossed = false;
    while (nextBreak < breaks.length) {
      const { time, end } = breaks[nextBreak];
      if (end ? time >= point.time : time > point.time) break;
      crossed =
        crossed ||
        (previous !== undefined &&
          (end ? time >= previous.time : time > previous.time));
      nextBreak++;
    }
    if (previous && !crossed && point.time - previous.time <= POINTER_GAP_MS) {
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      if (finite(distance) && distance > 0)
        bucket(point.time).mouse += distance;
    }
    previous = point;
  }
  return buckets;
}

/** The stacked bands, bottom first. Clicks are moments, not amounts, and are
 * drawn as marks instead (see `clickMarks`). */
export const ACTIVITY_LAYERS = ['mouse', 'scroll', 'inputs'] as const;

/** Where to mark clicks on the timeline: `from` and `to` are fractions of its
 * width, equal for a single click. Clicks that would touch share one mark
 * that spans them, so a burst reads as one longer mark. Each click is placed
 * at its exact time, also at the edge of a compressed idle gap. */
export function clickMarks(
  clickTimes: readonly number[],
  scale: ActivityScale,
) {
  const positions = clickTimes
    .filter((time) => finite(time) && time >= 0 && time <= scale.total)
    .map(scale.timeToPosition)
    .sort((a, b) => a - b);
  const marks: { from: number; to: number; count: number }[] = [];
  for (const position of positions) {
    const last = marks[marks.length - 1];
    if (last && position - last.to < CLICK_MERGE_FRACTION) {
      last.to = position;
      last.count++;
    } else marks.push({ from: position, to: position, count: 1 });
  }
  return marks;
}

/** A sampled drawing of the stacked bands with 601 grid points, plus idle
 * edges and bins that share a grid point on opposite sides of a gap.
 *
 * Each sample's `layers` follow the order of ACTIVITY_LAYERS, bottom of the
 * stack first. Every layer is scaled to its own highest value and gets an
 * equal share of the height, so a full-height stack means all three peak at
 * once. Heights compare a layer with itself over time; they do not compare
 * layers with each other or one recording with another. */
export function activitySamples(
  buckets: Map<number, ActivityBucket>,
  scale: ActivityScale,
) {
  const positions = Array.from(
    { length: SAMPLE_INTERVALS + 1 },
    (_, index) => index / SAMPLE_INTERVALS,
  );
  // When a display interval spans several seconds, collect every occupied
  // bucket in it. Sampling only at the grid point loses isolated bursts.
  const coarse = new Map<
    number,
    Map<number, { position: number; values: ActivityBucket }>
  >();
  const ordered = [...buckets.entries()].sort(([a], [b]) => a - b);
  const beforeSpanEnd = (time: number, end: number) =>
    time < end || (time === end && end === scale.total);
  // A bucket that reaches into active time belongs there; drawing it in the
  // neighbouring idle span too would show activity before it happened.
  const activeSpans = scale.spans.filter((span) => !span.idle);
  const touchesActive = (second: number) =>
    activeSpans.some(
      (span) => second * 1000 < span.end && (second + 1) * 1000 > span.start,
    );
  const coarseSpan = (span: (typeof scale.spans)[number]) =>
    span.end - span.start > (span.right - span.left) * SAMPLE_INTERVALS * 1000;
  let first = 0;
  for (const span of scale.spans) {
    // Idle spans can still hold activity at their edges, such as the
    // interaction that starts a trailing gap.
    if (!coarseSpan(span)) continue;
    while (
      first < ordered.length &&
      (ordered[first][0] + 1) * 1000 <= span.start
    )
      first++;
    for (
      let i = first;
      i < ordered.length && beforeSpanEnd(ordered[i][0] * 1000, span.end);
      i++
    ) {
      const [second, bucket] = ordered[i];
      if (span.idle && touchesActive(second)) continue;
      const start = Math.max(span.start, second * 1000);
      const end = Math.min(span.end, (second + 1) * 1000);
      const position = scale.timeToPosition((start + end) / 2);
      const index = Math.round(position * SAMPLE_INTERVALS);
      const bins =
        coarse.get(index) ??
        new Map<number, { position: number; values: ActivityBucket }>();
      const bin = bins.get(span.start) ?? { position, values: empty() };
      // Counts and distances belong to discrete events. Keep their full value
      // when the bucket overlaps only the edge of an active span.
      for (const key of ACTIVITY_LAYERS) bin.values[key] += bucket[key];
      bins.set(span.start, bin);
      coarse.set(index, bins);
    }
  }
  function smoothedSample(position: number) {
    const time = scale.positionToTime(position);
    const span = scale.spans.find(
      (part) => time >= part.start && beforeSpanEnd(time, part.end),
    );
    const values = empty();
    if (span) {
      const second = Math.floor(time / 1000);
      const radius = BUCKET_RADIUS_S;
      for (let offset = -1; offset <= 1; offset++) {
        const at = (second + offset) * 1000;
        // Keep a bucket that overlaps the active span, such as the second
        // in which activity resumes after a gap.
        if (at + 1000 <= span.start || !beforeSpanEnd(at, span.end)) continue;
        const bucket = buckets.get(second + offset);
        if (!bucket || (span.idle && touchesActive(second + offset))) continue;
        // A continuous kernel around each bucket's centre avoids stair steps
        // at second boundaries. The buckets themselves are left unchanged.
        const distance = Math.abs((time - at - 500) / 1000);
        if (distance >= radius) continue;
        const weight =
          (1 + Math.cos((Math.PI * distance) / radius)) / (2 * radius);
        for (const key of ACTIVITY_LAYERS) values[key] += bucket[key] * weight;
      }
      // Ease to the baseline on the active side of an idle boundary. Use
      // display distance so compressed gaps don't turn this into a cliff.
      if (span.idle) return { position, time, values };
      const width = Math.min(IDLE_EDGE_TAPER, (span.right - span.left) / 3);
      const edge = Math.min(
        1,
        span.start > 0 ? (position - span.left) / width : 1,
        span.end < scale.total ? (span.right - position) / width : 1,
      );
      const taper = edge * edge * (3 - 2 * edge);
      for (const key of ACTIVITY_LAYERS) values[key] *= taper;
    }
    return { position, time, values };
  }
  const samples = positions.flatMap((position, index) => {
    const bins = coarse.get(index);
    if (bins)
      return Array.from(bins.values(), (bin) => ({
        position: bin.position,
        time: scale.positionToTime(bin.position),
        values: bin.values,
      }));
    return smoothedSample(position);
  });
  // An active span narrower than one grid interval may contain no grid
  // point; give it one so its activity still shows.
  for (const span of activeSpans) {
    if (samples.some((s) => s.position > span.left && s.position < span.right))
      continue;
    const values = empty();
    const last = Math.max(span.start, span.end - 1);
    for (
      let second = Math.floor(span.start / 1000);
      second * 1000 <= last;
      second++
    ) {
      const bucket = buckets.get(second);
      if (bucket) for (const key of ACTIVITY_LAYERS) values[key] += bucket[key];
    }
    const position = (span.left + span.right) / 2;
    samples.push({ position, time: scale.positionToTime(position), values });
  }
  // A bucket cut by an idle edge can fall between two grid points and outside
  // the smoothing of both. Sample the middle of its active part.
  for (const span of activeSpans) {
    if (coarseSpan(span)) continue;
    const edges = new Set<number>();
    if (span.start > 0) edges.add(Math.floor(span.start / 1000));
    if (span.end < scale.total) edges.add(Math.ceil(span.end / 1000) - 1);
    for (const second of edges) {
      if (!buckets.has(second)) continue;
      const start = Math.max(span.start, second * 1000);
      const end = Math.min(span.end, (second + 1) * 1000);
      if (samples.some((s) => s.time > start && s.time < end)) continue;
      samples.push(smoothedSample(scale.timeToPosition((start + end) / 2)));
    }
  }
  // Baseline anchors keep the graph out of idle gaps narrower than one grid
  // interval, including when activity on either side shares a grid point.
  for (const span of scale.spans) {
    if (!span.idle) continue;
    for (const time of [span.start, span.end])
      samples.push({
        position: scale.timeToPosition(time),
        time,
        values: empty(),
      });
  }
  samples.sort((a, b) => a.position - b.position);
  const maxima = empty();
  for (const sample of samples)
    for (const key of ACTIVITY_LAYERS)
      maxima[key] = Math.max(maxima[key], sample.values[key]);
  return samples.map(({ position, time, values }) => ({
    position,
    time,
    layers: ACTIVITY_LAYERS.map((key) =>
      maxima[key] ? values[key] / maxima[key] / ACTIVITY_LAYERS.length : 0,
    ),
  }));
}
