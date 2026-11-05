import type { eventWithTime } from '@rrweb/types';

export enum StallEvents {
  BufferingStart = 'buffering-start',
  BufferingEnd = 'buffering-end',
}

export interface StallController {
  registerEvent(event: eventWithTime): void;
  stallOnPlay(timeOffset: number): boolean;
  stallOnPause(timeOffset: number): boolean;
  isStallMarker(event: eventWithTime): boolean;
}
