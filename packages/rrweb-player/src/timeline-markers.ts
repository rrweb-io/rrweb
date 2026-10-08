import type { TimelineMarker } from './types';

export type DisplayTimelineMarker = Readonly<TimelineMarker> & {
  source: 'recorded' | 'external';
};
export type TimelineMarkerGroup = {
  markers: [DisplayTimelineMarker, ...DisplayTimelineMarker[]];
  position: number;
};

/** Validate before changing state; callers retain ownership of their input objects. */
export function copyTimelineMarkers(
  markers: readonly TimelineMarker[],
): TimelineMarker[] {
  const ids = new Set<string>();
  return Array.from(markers, (marker) => {
    if (
      marker == null ||
      typeof marker.id !== 'string' ||
      !marker.id ||
      ids.has(marker.id) ||
      !Number.isFinite(marker.timeOffset) ||
      marker.timeOffset < 0 ||
      typeof marker.text !== 'string' ||
      (marker.label !== undefined && typeof marker.label !== 'string') ||
      (marker.color !== undefined && typeof marker.color !== 'string')
    )
      throw new TypeError(
        'Timeline markers require unique nonempty IDs, finite nonnegative timeOffset, and string text/label/color.',
      );
    ids.add(marker.id);
    return {
      id: marker.id,
      timeOffset: marker.timeOffset,
      text: marker.text,
      label: marker.label,
      color: marker.color,
    };
  });
}

export function markerKey(marker: DisplayTimelineMarker): string {
  return JSON.stringify([marker.source, marker.id]);
}

/** Group relative to the first point, so a dense chain cannot swallow a whole recording. */
export function groupTimelineMarkers(
  markers: readonly DisplayTimelineMarker[],
  totalTime: number,
  width: number,
): TimelineMarkerGroup[] {
  const groups: TimelineMarkerGroup[] = [];
  for (const marker of [...markers].sort(
    (a, b) => a.timeOffset - b.timeOffset,
  )) {
    const position =
      totalTime > 0
        ? Math.max(0, Math.min(100, (marker.timeOffset / totalTime) * 100))
        : 0;
    const group = groups[groups.length - 1];
    if (
      group &&
      (position === group.position ||
        (width > 0 && ((position - group.position) * width) / 100 < 9))
    ) {
      group.markers.push(marker);
    } else {
      groups.push({ markers: [marker], position });
    }
  }
  return groups;
}
