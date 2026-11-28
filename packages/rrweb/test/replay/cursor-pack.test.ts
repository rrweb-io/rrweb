import { describe, expect, it } from 'vitest';
import { cursors } from '../../src/replay/cursor-pack';

// The end points of each drawing command in a path, as [x, y] pairs.
function points(d: string): number[][] {
  const result: number[][] = [];
  for (const command of d.match(/[MLQ][^MLQZ]*/g) ?? []) {
    const numbers = command
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    result.push(numbers.slice(-2));
  }
  return result;
}

function distanceToSegment(p: number[], a: number[], b: number[]) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const length = dx * dx + dy * dy;
  const t = length
    ? Math.max(
        0,
        Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length),
      )
    : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

describe('hand cursors', () => {
  it.each(['pointer', 'grab', 'grabbing'])(
    'starts each line between the fingers of %s on the outline',
    (name) => {
      const svg = cursors[name][0];
      const [outline, separators] = [...svg.matchAll(/<path d="([^"]+)"/g)].map(
        (match) => match[1],
      );
      const corners = points(outline);
      const starts = separators
        .match(/M[^M]+/g)!
        .map((line) => points(line)[0]);
      for (const start of starts) {
        const gap = Math.min(
          ...corners.map((corner, i) =>
            distanceToSegment(
              start,
              corners[(i || corners.length) - 1],
              corner,
            ),
          ),
        );
        expect(gap).toBeLessThan(0.1);
      }
    },
  );
});
