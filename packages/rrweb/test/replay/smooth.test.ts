import { describe, expect, it } from 'vitest';
import { EventType, IncrementalSource, type eventWithTime } from '@rrweb/types';
import {
  cursorAt,
  drawTaperedTrail,
  findNextScroll,
  glideAt,
  haloScale,
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

  it('does not interpolate across different targets', () => {
    expect(cursorAt([s(0, 0, 0, 1), s(100, 50, 0, 2)], 50)!.x).toBe(0);
  });

  it('uses only neighbours closer than REST_GAP_MS as spline control points', () => {
    const far = [s(0, -1000), s(REST_GAP_MS + 1, 0), s(REST_GAP_MS + 51, 10)];
    expect(cursorAt(far, REST_GAP_MS + 26)!.x).toBeCloseTo(5);
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
    drawTaperedTrail(ctx, [s(0, 0), s(1, 1), s(2, 2), s(3, 3)], 3.9);
    expect(widths).toEqual([1.3, 2.6, 3.9]);
    widths.length = 0;
    drawTaperedTrail(ctx, [s(0, 0)], 3.9);
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
