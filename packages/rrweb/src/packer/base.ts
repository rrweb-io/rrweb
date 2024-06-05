import type { eventWithTime } from '@rrweb/types';
import type { ZlibOptions } from 'fflate';

export type PackFn = (event: eventWithTime, options?: ZlibOptions) => string;
export type UnpackFn = (raw: string) => eventWithTime;

export type eventWithTimeAndPacker = eventWithTime & {
  v: string;
};

export const MARK = 'v1';
