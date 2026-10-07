import { describe, expect, it } from 'vitest';
import { groupTimelineMarkers, markerKey } from '../src/timeline-markers';
import type { DisplayTimelineMarker } from '../src/timeline-markers';
const marker = (
  id: string,
  timeOffset: number,
  source: 'recorded' | 'external' = 'external',
): DisplayTimelineMarker => ({ id, timeOffset, text: id, source });
describe('timeline marker layout', () => {
  it('groups within 9 pixels of the first point without chaining the whole recording', () => {
    const points = [
      marker('c', 170),
      marker('b', 80),
      marker('a', 0),
      marker('d', 180),
    ];
    expect(
      groupTimelineMarkers(points, 1000, 100).map((g) =>
        g.markers.map((m) => m.id),
      ),
    ).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(points.map((m) => m.id)).toEqual(['c', 'b', 'a', 'd']);
    expect(groupTimelineMarkers(points, 1000, 1000)).toHaveLength(4);
  });
  it('scopes identities and handles equal times, zero duration and out-of-range offsets', () => {
    expect(markerKey(marker('same', 0))).not.toBe(
      markerKey(marker('same', 0, 'recorded')),
    );
    const points = [
      marker('same', 500, 'recorded'),
      marker('same', 500),
      marker('end', 2000),
    ];
    expect(
      groupTimelineMarkers(points, 1000, 100).map((g) => g.position),
    ).toEqual([50, 100]);
    expect(groupTimelineMarkers(points, 0, 100).map((g) => g.position)).toEqual(
      [0],
    );
  });
});
