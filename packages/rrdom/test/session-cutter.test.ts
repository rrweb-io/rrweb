import rewire from 'rewire';
import { EventType, eventWithTime } from 'rrweb/src/types';
import { sessionCut } from '../src/trim';
const rewiredSessionCutter = rewire('../lib/trim');
const getValidSortedPoints = rewiredSessionCutter.__get__(
  'getValidSortedPoints',
);

describe('session cutter', () => {
  it('should return the same events if the events length is too short', () => {
    const events1: eventWithTime[] = [];
    const config = { points: [10] };
    expect(sessionCut(events1, config)).toEqual(events1);

    const events2: eventWithTime[] = [
      {
        type: EventType.Load,
        data: {},
        timestamp: 1,
      } as eventWithTime,
    ];
    expect(sessionCut(events2, config)).toEqual(events2);
  });

  it('should return the same events if the points length is 0', () => {
    const events: eventWithTime[] = [
      {
        type: EventType.Load,
        data: {},
        timestamp: 1,
      } as eventWithTime,
      {
        type: EventType.Meta,
        data: {},
        timestamp: 2,
      } as eventWithTime,
    ];
    const config = { points: [] };
    expect(sessionCut(events, config)).toEqual(events);
  });

  it('should sort and validate cutting points array', () => {
    const inputPoints = [10, 250.5, -10, -1, 0, 100];
    expect(getValidSortedPoints([], 100)).toEqual([]);
    expect(getValidSortedPoints(inputPoints, 10)).toEqual([10]);
    expect(getValidSortedPoints(inputPoints, 100)).toEqual([10, 100]);
    expect(getValidSortedPoints(inputPoints, 300)).toEqual([10, 100, 250.5]);
  });
});
