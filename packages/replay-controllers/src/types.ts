import type { eventWithTime } from '@rrweb/types';

/**
 * Signature of how to fetch a set of events for a given segment
 * the string[] return format is for packed events
 * it should use an AbortController to apply a timeout to fetches
 * as the SegmentController will await it indefinitely:
 * https://developer.mozilla.org/en-US/docs/Web/API/AbortController
 */
export type SegmentFetchFn = (
  fetchQuery: string,
) => Promise<Array<eventWithTime | string>>;
