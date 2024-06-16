import { discardPriorSnapshots } from '../src/replay/machine';
import { sampleEvents } from './utils';
import { EventType } from '@saola.ai/rrweb-types';

const events = sampleEvents.filter(
  (e) => ![EventType.DomContentLoaded, EventType.Load].includes(e.type),
);
const nextEvents = events.map((e) => ({
  ...e,
  timestamp: e.timestamp + 1000,
}));
const nextNextEvents = nextEvents.map((e) => ({
  ...e,
  timestamp: e.timestamp + 1000,
}));

describe('get last session', () => {
  it('will return all the events when there is only one session', () => {
    expect(discardPriorSnapshots(events, events[0].timestamp)).toEqual(events);
  });

  it('will return last session when there is more than one in the events', () => {
    const multiple = events.concat(nextEvents).concat(nextNextEvents);
    expect(
      discardPriorSnapshots(
        multiple,
        nextNextEvents[nextNextEvents.length - 1].timestamp,
      ),
    ).toEqual(nextNextEvents);
  });

  it('will return last session when baseline time is future time', () => {
    const multiple = events.concat(nextEvents).concat(nextNextEvents);
    expect(
      discardPriorSnapshots(
        multiple,
        nextNextEvents[nextNextEvents.length - 1].timestamp + 1000,
      ),
    ).toEqual(nextNextEvents);
  });

  it('will return all sessions when baseline time is prior time', () => {
    expect(discardPriorSnapshots(events, events[0].timestamp - 1000)).toEqual(
      events,
    );
  });
});
