import { addDelay, LastDelay } from '../../src/replay/timer';
import {
  CanvasContext,
  EventType,
  eventWithTime,
  IncrementalSource,
} from '../../src/types';

const canvasMutationEventWithTime = (
  timestamp: number,
  newFrame?: boolean,
): eventWithTime => {
  const newFrameObj: { newFrame: true } | {} = newFrame
    ? { newFrame: true }
    : {};

  return {
    timestamp,
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.CanvasMutation,
      property: 'x',
      args: [],
      id: 1,
      type: CanvasContext.WebGL,
      ...newFrameObj,
    },
  };
};

describe('addDelay', () => {
  let baselineTime: number;
  let lastDelay: LastDelay;
  beforeEach(() => {
    baselineTime = 0;
    lastDelay = {
      at: null,
    };
  });
  it('should bundle canvas mutations together', () => {
    const event1 = canvasMutationEventWithTime(1000);
    const event2 = canvasMutationEventWithTime(1001);
    addDelay(event1, baselineTime, lastDelay);
    addDelay(event2, baselineTime, lastDelay);
    expect(event2.delay).toBe(1000);
  });

  it('should bundle canvas mutations on the same frame together', () => {
    const event1 = canvasMutationEventWithTime(1000);
    const event2 = canvasMutationEventWithTime(1001);
    const event3 = canvasMutationEventWithTime(1002, true);
    const event4 = canvasMutationEventWithTime(1003);
    addDelay(event1, baselineTime, lastDelay);
    addDelay(event2, baselineTime, lastDelay);
    addDelay(event3, baselineTime, lastDelay);
    addDelay(event4, baselineTime, lastDelay);
    expect(event2.delay).toBe(1000);
    expect(event3.delay).toBe(1002);
    expect(event4.delay).toBe(1002);
  });
});
