import type { eventWithTime } from '@newrelic/rrweb-types';
export type eventWithTimeAndPacker = eventWithTime & {
  v: string;
};
export declare const MARK = 'v1';
