import { describe, expect, it } from 'vitest';
import { createReplayTimelineScale } from '../src/timeline-scale';
describe('compressed replay time scale', () => {
  const gaps = [
    [45_000, 195_000],
    [230_000, 515_000],
    [580_000, 690_000],
  ] as const;
  it('allocates one shared 20% budget, proportionally within each kind of time', () => {
    const scale = createReplayTimelineScale(720_000, gaps);
    expect(scale.idleShare).toBe(0.2);
    const idle = scale.spans.filter((s) => s.idle);
    expect(idle.reduce((sum, s) => sum + s.right - s.left, 0)).toBeCloseTo(
      0.2,
      12,
    );
    expect(
      (idle[0].right - idle[0].left) / (idle[1].right - idle[1].left),
    ).toBeCloseTo(150 / 285, 12);
    expect(scale.timeToPosition(45_000)).toBeCloseTo((0.8 * 45) / 175, 12);
    expect(scale.timeToPosition(195_000)).toBeCloseTo(
      (0.8 * 45) / 175 + (0.2 * 150) / 545,
      12,
    );
  });
  it('round-trips every second, every boundary, and fractional times inside inactivity', () => {
    const scale = createReplayTimelineScale(720_000, gaps);
    for (let time = 0; time <= 720_000; time += 1000)
      expect(scale.positionToTime(scale.timeToPosition(time))).toBeCloseTo(
        time,
        7,
      );
    for (const [a, b] of gaps)
      for (const time of [
        a - 0.1,
        a,
        a + 0.1,
        (a + b) / 2,
        b - 0.1,
        b,
        b + 0.1,
      ])
        expect(scale.positionToTime(scale.timeToPosition(time))).toBeCloseTo(
          time,
          7,
        );
    for (let i = 0; i <= 1000; i++)
      expect(scale.timeToPosition(scale.positionToTime(i / 1000))).toBeCloseTo(
        i / 1000,
        12,
      );
  });
  it('does not enlarge idle periods when their natural share is below the cap', () => {
    const scale = createReplayTimelineScale(1000, [[100, 150]]);
    expect(scale.idleShare).toBe(0.05);
    for (let t = 0; t <= 1000; t += 10)
      expect(scale.timeToPosition(t)).toBeCloseTo(t / 1000, 12);
  });
  it.each([{ intervals: [] }, { intervals: [[0, 1000]] }])(
    'keeps no-idle and all-idle recordings seekable: %j',
    ({ intervals }) => {
      const scale = createReplayTimelineScale(
        1000,
        intervals as [number, number][],
      );
      expect(scale.positionToTime(0.5)).toBe(500);
      expect(scale.timeToPosition(500)).toBe(0.5);
      expect(scale.spans).toHaveLength(1);
    },
  );
  it('clips, merges and sorts idle spans without double-counting', () => {
    const scale = createReplayTimelineScale(100, [
      [50, 80],
      [40, 60],
      [-20, 10],
      [80, 120],
      [70, 60],
      [NaN, 90],
      [100, 200],
    ]);
    expect(
      scale.spans.filter((s) => s.idle).map((s) => [s.start, s.end]),
    ).toEqual([
      [0, 10],
      [40, 100],
    ]);
    expect(scale.idleShare).toBe(0.2);
  });
  it('bounds out-of-range seeks and handles empty/zero-length recordings', () => {
    for (const duration of [0, -1, NaN, Infinity]) {
      const scale = createReplayTimelineScale(duration, [[0, 1000]]);
      expect(scale.timeToPosition(100)).toBe(0);
      expect(scale.positionToTime(0.5)).toBe(0);
    }
    const scale = createReplayTimelineScale(1000, [[100, 900]]);
    expect(scale.positionToTime(-1)).toBe(0);
    expect(scale.positionToTime(2)).toBe(1000);
    expect(scale.timeToPosition(Infinity)).toBe(1);
    expect(scale.timeToPosition(-Infinity)).toBe(0);
    expect(scale.positionToTime(NaN)).toBe(0);
  });
  it('stays monotonic and reversible with many intervals and very long gaps', () => {
    const intervals = Array.from({ length: 200 }, (_, i): [number, number] => [
      i * 5000 + 100,
      i * 5000 + 4900,
    ]);
    const scale = createReplayTimelineScale(1_000_000, intervals);
    let previous = -1;
    for (let i = 0; i <= 4000; i++) {
      const position = i / 4000;
      const time = scale.positionToTime(position);
      expect(time).toBeGreaterThanOrEqual(previous);
      expect(scale.timeToPosition(time)).toBeCloseTo(position, 10);
      previous = time;
    }
    const long = createReplayTimelineScale(86_400_000, [[10, 86_399_990]]);
    expect(long.idleShare).toBe(0.2);
    expect(long.positionToTime(long.timeToPosition(86_399_995))).toBeCloseTo(
      86_399_995,
      5,
    );
  });
});

describe('uncompressed replay time scale', () => {
  it('maps clicks and times exactly like the classic linear timeline', () => {
    // Compression off: idle spans keep their full share.
    const scale = createReplayTimelineScale(60_000, [[10_000, 60_000]], 1);
    for (let px = 0; px <= 600; px++) {
      expect(scale.positionToTime(px / 600)).toBe(60_000 * (px / 600));
    }
    expect(scale.timeToPosition(55_000)).toBe(55_000 / 60_000);
  });
});
