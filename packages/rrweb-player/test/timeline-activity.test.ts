import { describe, expect, it } from 'vitest';
import { createReplayTimelineScale } from '../src/timeline-scale';
import {
  activitySamples,
  bucketReplayActivity,
  clickMarks,
  replayClickTimes,
  replayNavigationTimes,
  type ActivityEvent,
} from '../src/timeline-activity';

const event = (time: number, data: unknown): ActivityEvent => ({
  type: 3,
  timestamp: 1000 + time,
  data,
});
const meta: ActivityEvent = { type: 4, timestamp: 1000 };
describe('timeline activity', () => {
  it('counts clicks and input events without reading their content', () => {
    const input = {
      source: 5,
      get text() {
        throw new Error('Input content must not be read');
      },
      get isChecked() {
        throw new Error('Input values must not be read');
      },
    };
    const buckets = bucketReplayActivity(
      [
        meta,
        event(1100, { source: 2, type: 0 }), // mousedown is not a second click
        event(1200, { source: 2, type: 2 }),
        event(1500, input),
        event(1600, input),
        event(2000, { source: 0 }),
      ],
      3000,
    );
    expect(buckets.get(1)).toEqual({
      clicks: 1,
      inputs: 2,
      mouse: 0,
      scroll: 0,
    });
    expect(buckets.has(2)).toBe(false);
  });
  it('places batched movement at its sample time and does not bridge idle gaps or snapshots', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        event(2200, {
          source: 1,
          positions: [
            { x: 0, y: 0, timeOffset: -1400 },
            { x: 3, y: 4, timeOffset: -900 },
            { x: 6, y: 8, timeOffset: 0 },
          ],
        }),
        event(20000, {
          source: 1,
          positions: [{ x: 600, y: 800, timeOffset: 0 }],
        }),
        { type: 2, timestamp: 22000, data: {} },
        event(22000, {
          source: 1,
          positions: [{ x: 0, y: 0, timeOffset: 0 }],
        }),
      ],
      30000,
    );
    expect(buckets.get(1)?.mouse).toBe(5);
    expect(buckets.get(2)?.mouse).toBe(5);
    expect(buckets.has(20)).toBe(false);
    expect(buckets.has(22)).toBe(false);
  });
  it('does not join separate touch gestures', () => {
    const swipe = (time: number, x: number) =>
      event(time, {
        source: 6,
        positions: [
          { x, y: 0, timeOffset: -50 },
          { x: x + 10, y: 0, timeOffset: 0 },
        ],
      });
    const buckets = bucketReplayActivity(
      [
        meta,
        event(1000, { source: 2, type: 7 }),
        swipe(1100, 0),
        event(1150, { source: 2, type: 9 }),
        event(1300, { source: 2, type: 7 }),
        swipe(1400, 500),
        event(1450, { source: 2, type: 9 }),
      ],
      3000,
    );
    expect(buckets.get(1)?.mouse).toBe(20);
  });
  it('keeps movement that ends at the same moment as the touch', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        event(1000, { source: 2, type: 7 }),
        event(1100, {
          source: 6,
          positions: [
            { x: 0, y: 0, timeOffset: -50 },
            { x: 10, y: 0, timeOffset: 0 },
          ],
        }),
        event(1100, { source: 2, type: 9 }),
      ],
      3000,
    );
    expect(buckets.get(1)?.mouse).toBe(10);
  });

  it('does not join two touch gestures delivered in one batch', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        event(1000, { source: 2, type: 7 }),
        event(1100, { source: 2, type: 9 }),
        event(1200, { source: 2, type: 7 }),
        event(1300, { source: 2, type: 9 }),
        event(1400, {
          source: 6,
          positions: [
            { x: 0, y: 0, timeOffset: -380 },
            { x: 10, y: 0, timeOffset: -320 },
            { x: 500, y: 0, timeOffset: -180 },
            { x: 510, y: 0, timeOffset: -120 },
          ],
        }),
      ],
      3000,
    );
    expect(buckets.get(1)?.mouse).toBe(20);
  });

  it('counts a swipe from where the touch started', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        event(1000, { source: 2, type: 7, x: 0, y: 0 }),
        event(1100, {
          source: 6,
          positions: [{ x: 100, y: 0, timeOffset: 0 }],
        }),
        event(1150, { source: 2, type: 9, x: 100, y: 0 }),
      ],
      3000,
    );
    expect(buckets.get(1)?.mouse).toBe(100);
  });

  it('starts an attached iframe document unscrolled', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        {
          type: 2,
          timestamp: 1000,
          data: {
            node: { id: 1, type: 0, childNodes: [] },
            initialOffset: { left: 0, top: 40 },
          },
        },
        event(1500, {
          source: 0,
          adds: [{ parentId: 5, node: { id: 20, type: 0, childNodes: [] } }],
        }),
        event(2200, { source: 3, id: 20, x: 0, y: 500 }),
        event(2400, { source: 3, id: 1, x: 0, y: 100 }),
      ],
      3000,
    );
    // The iframe scrolls 500 from its origin; the page 60 from its recorded 40.
    expect(buckets.get(2)?.scroll).toBe(560);
  });

  it('starts a quirks-mode iframe document from the offset on its body', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        event(1500, {
          source: 0,
          adds: [
            {
              parentId: 5,
              node: {
                id: 30,
                type: 0,
                compatMode: 'BackCompat',
                childNodes: [
                  {
                    id: 31,
                    type: 2,
                    tagName: 'html',
                    attributes: {},
                    childNodes: [
                      {
                        id: 32,
                        type: 2,
                        tagName: 'head',
                        attributes: {},
                        childNodes: [],
                      },
                      {
                        id: 33,
                        type: 2,
                        tagName: 'body',
                        attributes: { rr_scrollTop: 500 },
                        childNodes: [],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }),
        event(2200, { source: 3, id: 30, x: 0, y: 600 }),
      ],
      3000,
    );
    expect(buckets.get(2)?.scroll).toBe(100);
  });

  it('starts an attached iframe document from the offset on its root element', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        event(1500, {
          source: 0,
          adds: [
            {
              parentId: 5,
              node: {
                id: 20,
                type: 0,
                childNodes: [
                  {
                    id: 21,
                    type: 2,
                    attributes: { rr_scrollTop: 500 },
                    childNodes: [],
                  },
                ],
              },
            },
          ],
        }),
        event(2200, { source: 3, id: 20, x: 0, y: 600 }),
      ],
      3000,
    );
    expect(buckets.get(2)?.scroll).toBe(100);
  });

  it('starts unscrolled nested scrollers at the origin, also when added later', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        {
          type: 2,
          timestamp: 1000,
          data: {
            node: {
              id: 1,
              type: 0,
              childNodes: [{ id: 7, type: 2, attributes: {}, childNodes: [] }],
            },
            initialOffset: { left: 0, top: 0 },
          },
        },
        event(1200, { source: 3, id: 7, x: 0, y: 500 }),
        event(2000, {
          source: 0,
          adds: [
            {
              parentId: 1,
              node: { id: 9, type: 2, attributes: {}, childNodes: [] },
            },
          ],
        }),
        event(2500, { source: 3, id: 9, x: 0, y: 300 }),
      ],
      3000,
    );
    expect(buckets.get(1)?.scroll).toBe(500);
    expect(buckets.get(2)?.scroll).toBe(300);
  });

  it('starts a nested scroller from the offset in the snapshot', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        {
          type: 2,
          timestamp: 1000,
          data: {
            node: {
              id: 1,
              childNodes: [
                {
                  id: 7,
                  type: 2,
                  attributes: { rr_scrollTop: 400 },
                  childNodes: [],
                },
              ],
            },
            initialOffset: { left: 0, top: 0 },
          },
        },
        event(1500, { source: 3, id: 7, x: 0, y: 500 }),
      ],
      3000,
    );
    expect(buckets.get(1)?.scroll).toBe(100);
  });

  it('uses per-scroller offsets and sums both directions, without an invented first origin', () => {
    const buckets = bucketReplayActivity(
      [
        meta,
        {
          type: 2,
          timestamp: 1000,
          data: { node: { id: 1 }, initialOffset: { left: 0, top: 0 } },
        },
        event(1000, { source: 3, id: 1, x: 0, y: 100 }),
        event(1200, { source: 3, id: 2, x: 0, y: 500 }),
        event(1400, { source: 3, id: 1, x: 0, y: 20 }),
        event(1600, { source: 3, id: 2, x: 0, y: 530 }),
      ],
      3000,
    );
    expect(buckets.get(1)?.scroll).toBe(210);
  });
  it('normalizes unlike units independently and leaves compressed idle gaps empty', () => {
    const scale = createReplayTimelineScale(30000, [[10000, 20000]]);
    const samples = activitySamples(
      new Map([[5, { clicks: 1, inputs: 1, scroll: 400, mouse: 933 }]]),
      scale,
    );
    const peak = samples.reduce((best, sample) =>
      sample.layers[0] > best.layers[0] ? sample : best,
    );
    // Three stacked bands, a third of the height each; clicks are not one.
    expect(peak.layers).toEqual([1 / 3, 1 / 3, 1 / 3]);
    expect(
      samples
        .filter((sample) => sample.time > 10000 && sample.time < 20000)
        .every((sample) => sample.layers.every((value) => value === 0)),
    ).toBe(true);
    const shoulder = samples.find(
      (sample) => sample.time >= 5000 && sample.time < 5250,
    )!;
    expect(shoulder.layers[2]).toBeGreaterThan(0);
    expect(shoulder.layers[2]).toBeLessThan(1 / 3);
    const withinSecond = samples.filter(
      (sample) => sample.time >= 5000 && sample.time < 5250,
    );
    expect(
      new Set(withinSecond.map((sample) => sample.layers[2])).size,
    ).toBeGreaterThan(1);
    expect(
      samples
        .filter((sample) => sample.time < 4750)
        .every((sample) => sample.layers[2] === 0),
    ).toBe(true);
  });
  it('tapers activity to zero at both sides of compressed inactivity', () => {
    const scale = createReplayTimelineScale(30000, [[10000, 20000]]);
    const samples = activitySamples(
      new Map(
        [9, 20].map((second) => [
          second,
          { clicks: 0, inputs: 1, scroll: 0, mouse: 0 },
        ]),
      ),
      scale,
    );
    const before = samples.filter((sample) => sample.time < 10000).at(-1)!;
    const after = samples.find((sample) => sample.time > 20000)!;
    expect(before.layers[2]).toBeLessThan(0.01);
    expect(after.layers[2]).toBeLessThan(0.01);
    expect(samples.some((sample) => sample.layers[2] === 1 / 3)).toBe(true);
  });
  it('keeps activity in the second in which it resumes after a gap', () => {
    // Activity resumes at 12.345 s, partway through the 12 s bucket.
    const scale = createReplayTimelineScale(30000, [[2000, 12345]]);
    const samples = activitySamples(
      new Map([[12, { clicks: 0, inputs: 1, scroll: 0, mouse: 0 }]]),
      scale,
    );
    expect(
      samples.some(
        (sample) =>
          sample.time > 12345 && sample.time < 13000 && sample.layers[2] > 0,
      ),
    ).toBe(true);
  });
  it('keeps a recording with only clicks out of the stacked bands', () => {
    const scale = createReplayTimelineScale(30000, []);
    const buckets = bucketReplayActivity(
      [meta, event(5000, { source: 2, type: 2 })],
      scale.total,
    );
    expect(buckets.get(5)?.clicks).toBe(1);
    expect(
      activitySamples(buckets, scale).every((sample) =>
        sample.layers.every((value) => value === 0),
      ),
    ).toBe(true);
  });
});

describe('click marks', () => {
  const scale = createReplayTimelineScale(81080, [
    [1725, 44437],
    [52648, 69754],
  ]);
  it.each([1725, 44437, 46924, 52648, 69754, 70966])(
    'marks a click at %sms at its exact position, including compressed idle boundaries',
    (time) => {
      expect(clickMarks([time], scale)).toEqual([
        {
          from: scale.timeToPosition(time),
          to: scale.timeToPosition(time),
          count: 1,
        },
      ]);
    },
  );
  it('reads click times from the events, whatever else was recorded', () => {
    expect(
      replayClickTimes([
        meta,
        event(1200, { source: 2, type: 2 }),
        // A mouse-down and an input are not clicks.
        event(1300, { source: 2, type: 1 }),
        event(1400, { source: 5 }),
        event(9000, { source: 2, type: 2 }),
      ]),
    ).toEqual([1200, 9000]);
  });
  it('merges a burst into one mark that spans it and keeps distant clicks apart', () => {
    const linear = createReplayTimelineScale(100000, []);
    // 300 ms apart is 0.3% of the width, inside the 0.8% merge distance;
    // each next click is measured from the previous one, so a chain merges.
    const marks = clickMarks([50600, 10000, 50000, 50300, 90000], linear);
    expect(marks).toEqual([
      { from: 0.1, to: 0.1, count: 1 },
      { from: 0.5, to: 0.506, count: 3 },
      { from: 0.9, to: 0.9, count: 1 },
    ]);
    // The distance is measured from the last click of the burst, so a
    // steady run longer than the merge distance is still one mark.
    expect(clickMarks([50000, 50600, 51200], linear)).toEqual([
      { from: 0.5, to: 0.512, count: 3 },
    ]);
    // 1% apart stays two marks.
    expect(clickMarks([50000, 51000], linear)).toHaveLength(2);
  });
  it('drops clicks outside the recording and returns nothing for none', () => {
    const linear = createReplayTimelineScale(10000, []);
    expect(clickMarks([-1, 10001, Number.NaN], linear)).toEqual([]);
    expect(clickMarks([], linear)).toEqual([]);
  });
});

describe('navigation marks', () => {
  const page = (time: number, href?: unknown): ActivityEvent => ({
    type: 4,
    timestamp: 1000 + time,
    data: { href, width: 800, height: 600 },
  });
  const snapshot = (time: number): ActivityEvent => ({
    type: 2,
    timestamp: 1000 + time,
    data: { node: { type: 0, id: 1, childNodes: [] } },
  });
  it('marks each move to a new URL and leaves out the first page', () => {
    expect(
      replayNavigationTimes([
        page(0, 'https://example.com/'),
        snapshot(0),
        page(4000, 'https://example.com/cart'),
        snapshot(4000),
        page(9000, 'https://example.com/'),
        snapshot(9000),
      ]),
    ).toEqual([4000, 9000]);
  });
  it('leaves out checkouts and reloads that keep the URL, and Meta events without one', () => {
    expect(
      replayNavigationTimes([
        page(0, 'https://example.com/'),
        page(3000, 'https://example.com/'),
        page(5000),
        page(6000, 42),
        page(8000, 'https://example.com/'),
      ]),
    ).toEqual([]);
  });
});

describe('sampling bounds', () => {
  it.each([10_000, 86_400_000])(
    'draws input recorded on the final sample at %sms',
    (duration) => {
      const scale = createReplayTimelineScale(duration, []);
      const buckets = bucketReplayActivity(
        [meta, event(duration, { source: 5 })],
        duration,
      );
      const samples = activitySamples(buckets, scale);
      expect(samples.at(-1)?.layers[2]).toBe(1 / 3);
    },
  );
  it('retains a full discrete input when activity resumes in the last millisecond of a bucket', () => {
    const scale = createReplayTimelineScale(86_400_000, [[1000, 60_999]]);
    const samples = activitySamples(
      bucketReplayActivity(
        [meta, event(60_999, { source: 5 }), event(600_000, { source: 5 })],
        scale.total,
      ),
      scale,
    );
    const resumed = samples.find((s) => s.time > 60_999 && s.time < 61_000)!;
    const later = samples.find((s) => s.time >= 600_000 && s.time < 601_000)!;
    expect(resumed.layers[2]).toBe(1 / 3);
    expect(resumed.layers[2]).toBe(later.layers[2]);
    // Nothing is drawn inside the idle stretch before it.
    expect(
      samples
        .filter((s) => s.time > 1000 && s.time < 60_999)
        .every((s) => s.layers[2] === 0),
    ).toBe(true);
  });
  it('shows a narrow active span whose edge falls on a grid point', () => {
    const scale = createReplayTimelineScale(
      30_000,
      [
        [0, 12_499],
        [12_500, 30_000],
      ],
      1,
    );
    const samples = activitySamples(
      bucketReplayActivity(
        [meta, event(12_499, { source: 5 }), event(12_500, { source: 5 })],
        scale.total,
      ),
      scale,
    );
    expect(samples.some((s) => s.layers[2] > 0)).toBe(true);
  });

  it('shows activity in an active span narrower than one grid interval', () => {
    // Linear, as without features.timeline.
    const scale = createReplayTimelineScale(
      30_000,
      [
        [0, 12_345],
        [12_346, 30_000],
      ],
      1,
    );
    const samples = activitySamples(
      bucketReplayActivity(
        [meta, event(12_345, { source: 5 }), event(12_346, { source: 5 })],
        scale.total,
      ),
      scale,
    );
    expect(samples.some((s) => s.layers[2] > 0)).toBe(true);
  });
  it('separates coarse bins on opposite sides of a sub-grid idle gap', () => {
    const start = 43_190_000,
      end = 43_210_000;
    const scale = createReplayTimelineScale(86_400_000, [[start, end]]);
    const samples = activitySamples(
      new Map(
        [43_189, 43_210].map((second) => [
          second,
          {
            clicks: 0,
            inputs: 1,
            mouse: 0,
            scroll: 0,
          },
        ]),
      ),
      scale,
    );
    const peaks = samples.filter((s) => s.layers[2] > 0);
    expect(peaks).toHaveLength(2);
    expect(peaks[0].time).toBeLessThan(start);
    expect(peaks[1].time).toBeGreaterThan(end);
    for (const time of [start, end])
      expect(samples.find((s) => s.time === time)?.layers).toEqual([0, 0, 0]);
    expect(
      samples
        .filter((s) => s.time >= start && s.time <= end)
        .every((s) => s.layers[2] === 0),
    ).toBe(true);
    expect(
      samples.every((s, i) => i === 0 || s.position >= samples[i - 1].position),
    ).toBe(true);
  });
  it.each([1, 0.2])(
    'draws input right after an idle gap in a 500-second session, idle share %s',
    (maxIdleShare) => {
      // The input's bucket is cut by the gap, and no grid point falls within
      // its smoothing on the active side.
      const events = [meta, event(180_900, { source: 5 })];
      for (let time = 185_900; time <= 500_000; time += 5000)
        events.push(event(time, { source: 2, type: 2 }));
      const scale = createReplayTimelineScale(
        500_000,
        [[0, 180_900]],
        maxIdleShare,
      );
      const samples = activitySamples(
        bucketReplayActivity(events, scale.total),
        scale,
      );
      const drawn = samples.filter((s) => s.layers[2] > 0);
      // Drawn within the part of its second that is active, and not before.
      expect(drawn.some((s) => s.time > 180_900 && s.time < 181_000)).toBe(
        true,
      );
      expect(drawn.every((s) => s.time > 180_900)).toBe(true);
    },
  );
  it('draws a one-second input burst between samples in a 24-hour session', () => {
    const samples = activitySamples(
      new Map([[70, { clicks: 0, inputs: 1, mouse: 0, scroll: 0 }]]),
      createReplayTimelineScale(86_400_000, []),
    );
    expect(samples).toHaveLength(601);
    expect(samples.find((s) => s.layers[2] > 0)?.time).toBeCloseTo(70_500);
  });
  it('keeps long and empty recordings bounded', () => {
    for (const total of [0, 24 * 60 * 60 * 1000]) {
      const samples = activitySamples(
        new Map(),
        createReplayTimelineScale(total, []),
      );
      expect(samples).toHaveLength(601);
      expect(
        samples.every((sample) => sample.layers.every((value) => value === 0)),
      ).toBe(true);
    }
  });
});
