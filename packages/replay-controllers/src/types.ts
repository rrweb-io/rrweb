import type { eventWithTime } from '@rrweb/types';

export type SegmentFetchFn = (
  segmentStart: number,
) => Promise<Array<eventWithTime | string>>;
