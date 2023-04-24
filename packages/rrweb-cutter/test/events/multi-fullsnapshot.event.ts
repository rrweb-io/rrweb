import { eventWithTime } from '@rrweb/types';
import { events as inputEvents } from './input.event';
import { events as mutationEvents } from './mutation.event';

const duration =
  mutationEvents[mutationEvents.length - 1].timestamp -
  mutationEvents[0].timestamp;
export const events: eventWithTime[] = [
  ...mutationEvents,
  ...inputEvents.map((e) => {
    e.timestamp += duration + 1;
    return e;
  }),
];
