import type { eventWithTime } from '@sentry-internal/rrweb-types';

export type PackFn = (event: eventWithTime) => string;
export type UnpackFn = (raw: string) => eventWithTime;

export type eventWithTimeAndPacker = eventWithTime & {
  v: string;
};

export const MARK = 'v1';
