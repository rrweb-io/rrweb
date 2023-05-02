import { eventWithTime } from '@rrweb/types';
import inputEvents from './input.event';
import mutationEvents from './mutation.event';

const duration =
  mutationEvents[mutationEvents.length - 1].timestamp -
  mutationEvents[0].timestamp;
const events: eventWithTime[] = [
  ...mutationEvents,
  ...inputEvents.map((e) => {
    e.timestamp += duration + 1;
    return e;
  }),
];

export default events;
