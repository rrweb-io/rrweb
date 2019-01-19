import { expect } from 'chai';
import { calcCheckpoints } from '../src/replay/checkpoint';
import { eventWithTime, EventType } from '../src/types';

const events: eventWithTime[] = new Array(1000)
  .fill({
    type: EventType.Load,
    data: {},
    timestamp: 0,
  })
  .map((e, idx) => {
    if (idx % 300 === 0) {
      return {
        type: EventType.FullSnapshot,
        data: {
          node: {
            type: 0,
            childNodes: [],
          },
          initialOffset: {
            top: 0,
            left: 0,
          },
        },
        timestamp: idx,
      };
    }
    e.timestamp = idx;
    return e;
  });

describe('checkpoint', () => {
  it('can calculate checkpoint indexes', () => {
    expect(calcCheckpoints(events)).to.deep.equal([
      0,
      101,
      202,
      300,
      401,
      502,
      600,
      701,
      802,
      900,
    ]);
  });
});
