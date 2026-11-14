import type { eventWithTime } from '@rrweb/types';

export { StallEvents } from '@rrweb/types';

export interface StallController {
  registerEvent(event: eventWithTime): void;
  stallOnPlay(timeOffset: number): boolean;
  stallOnPause(timeOffset: number): boolean;
  isStallMarker(event: eventWithTime): boolean;
}
