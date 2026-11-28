import { createTimelineIndex } from './timeline-index';
import { createReplayTimelineScale, type IdleInterval } from './timeline-scale';

export function scaleForTimelineIndex(
  timeline: ReturnType<ReturnType<typeof createTimelineIndex>>,
  inactivePeriodThreshold: number,
  maxIdleShare?: number,
) {
  const { start, end, lastActive, periods } = timeline;
  const intervals: IdleInterval[] = periods.map(([a, b]) => [
    a - start,
    b - start,
  ]);
  if (end - lastActive > inactivePeriodThreshold)
    intervals.push([lastActive - start, end - start]);
  return createReplayTimelineScale(end - start, intervals, maxIdleShare);
}
