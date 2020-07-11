import { expect } from 'chai';
import { getLastSession } from '../src/replay/machine';
import { sampleEvents } from './utils';
import { EventType } from '../src/types';

const events = sampleEvents.filter(
  (e) => ![EventType.DomContentLoaded, EventType.Load].includes(e.type),
);

describe('get last session', () => {
  it('will return all the events when there is only one session', () => {
    expect(getLastSession(events)).to.deep.equal(events);
  });

  it('will return last session when there is more than one in the events', () => {
    const multiple = events.concat(events).concat(events);
    expect(getLastSession(multiple)).to.deep.equal(events);
  });
});
