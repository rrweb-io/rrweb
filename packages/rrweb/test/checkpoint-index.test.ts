import {
  EventType,
  IncrementalSource,
  MouseInteractions,
} from '@amplitude/rrweb-types';
import type { eventWithTime } from '@amplitude/rrweb-types';
import {
  buildCheckpointIndex,
  findNearestCheckpoint,
  type SnapshotCheckpoint,
} from '../src/replay/checkpoint-index';
import { createPlayerService, type PlayerContext } from '../src/replay/machine';
import { Timer } from '../src/replay/timer';

const now = 1000000;

function makeMetaEvent(timestamp: number): eventWithTime {
  return {
    type: EventType.Meta,
    data: { href: 'http://localhost', width: 1000, height: 800 },
    timestamp,
  };
}

function makeFullSnapshotEvent(timestamp: number): eventWithTime {
  return {
    type: EventType.FullSnapshot,
    data: {
      node: { type: 0, childNodes: [], id: 1 },
      initialOffset: { top: 0, left: 0 },
    },
    timestamp,
  } as eventWithTime;
}

function makeIncrementalEvent(timestamp: number): eventWithTime {
  return {
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.MouseInteraction,
      type: MouseInteractions.Click,
      id: 1,
      x: 0,
      y: 0,
    },
    timestamp,
  };
}

describe('buildCheckpointIndex', () => {
  it('returns empty array for events with no Meta events', () => {
    // Arrange
    const events: eventWithTime[] = [
      makeFullSnapshotEvent(now),
      makeIncrementalEvent(now + 100),
    ];

    // Act
    const result = buildCheckpointIndex(events);

    // Assert
    expect(result).toEqual([]);
  });

  it('returns a single checkpoint for one Meta event', () => {
    // Arrange
    const events: eventWithTime[] = [
      makeMetaEvent(now),
      makeFullSnapshotEvent(now + 1),
      makeIncrementalEvent(now + 100),
    ];

    // Act
    const result = buildCheckpointIndex(events);

    // Assert
    expect(result).toEqual([{ metaEventIndex: 0, timestamp: now }]);
  });

  it('returns multiple checkpoints for multiple Meta events', () => {
    // Arrange
    const events: eventWithTime[] = [
      makeMetaEvent(now),
      makeFullSnapshotEvent(now + 1),
      makeIncrementalEvent(now + 100),
      makeMetaEvent(now + 1000),
      makeFullSnapshotEvent(now + 1001),
      makeIncrementalEvent(now + 1100),
      makeMetaEvent(now + 2000),
      makeFullSnapshotEvent(now + 2001),
    ];

    // Act
    const result = buildCheckpointIndex(events);

    // Assert
    expect(result).toEqual([
      { metaEventIndex: 0, timestamp: now },
      { metaEventIndex: 3, timestamp: now + 1000 },
      { metaEventIndex: 6, timestamp: now + 2000 },
    ]);
  });

  it('returns empty array for empty events', () => {
    // Arrange & Act
    const result = buildCheckpointIndex([]);

    // Assert
    expect(result).toEqual([]);
  });
});

describe('findNearestCheckpoint', () => {
  const checkpoints: SnapshotCheckpoint[] = [
    { metaEventIndex: 0, timestamp: 1000 },
    { metaEventIndex: 5, timestamp: 2000 },
    { metaEventIndex: 10, timestamp: 3000 },
    { metaEventIndex: 15, timestamp: 4000 },
  ];

  it('returns null for empty checkpoints', () => {
    // Arrange & Act
    const result = findNearestCheckpoint([], 1500);

    // Assert
    expect(result).toEqual(null);
  });

  it('returns null when baselineTime is before all checkpoints', () => {
    // Arrange & Act
    const result = findNearestCheckpoint(checkpoints, 500);

    // Assert
    expect(result).toEqual(null);
  });

  it('returns the first checkpoint when baselineTime matches it exactly', () => {
    // Arrange & Act
    const result = findNearestCheckpoint(checkpoints, 1000);

    // Assert
    expect(result).toEqual({ metaEventIndex: 0, timestamp: 1000 });
  });

  it('returns the last checkpoint at or before baselineTime', () => {
    // Arrange & Act
    const result = findNearestCheckpoint(checkpoints, 2500);

    // Assert
    expect(result).toEqual({ metaEventIndex: 5, timestamp: 2000 });
  });

  it('returns the last checkpoint when baselineTime is after all checkpoints', () => {
    // Arrange & Act
    const result = findNearestCheckpoint(checkpoints, 9999);

    // Assert
    expect(result).toEqual({ metaEventIndex: 15, timestamp: 4000 });
  });

  it('returns exact match when baselineTime equals a checkpoint', () => {
    // Arrange & Act
    const result = findNearestCheckpoint(checkpoints, 3000);

    // Assert
    expect(result).toEqual({ metaEventIndex: 10, timestamp: 3000 });
  });

  it('works with a single checkpoint', () => {
    // Arrange
    const single: SnapshotCheckpoint[] = [
      { metaEventIndex: 0, timestamp: 1000 },
    ];

    // Act & Assert
    expect(findNearestCheckpoint(single, 999)).toEqual(null);
    expect(findNearestCheckpoint(single, 1000)).toEqual({
      metaEventIndex: 0,
      timestamp: 1000,
    });
    expect(findNearestCheckpoint(single, 2000)).toEqual({
      metaEventIndex: 0,
      timestamp: 1000,
    });
  });
});

describe('checkpoint index maintenance via addEvent', () => {
  // Helper to create a player service with initial events and extract
  // the checkpoint index from its context after adding events.
  function createTestService(initialEvents: eventWithTime[]): {
    service: ReturnType<typeof createPlayerService>;
    getContext: () => PlayerContext;
  } {
    const sorted = [...initialEvents].sort((a, b) => a.timestamp - b.timestamp);
    const checkpointIndex = buildCheckpointIndex(sorted);
    const timer = new Timer([], { speed: 1 });
    const context: PlayerContext = {
      events: sorted,
      timer,
      timeOffset: 0,
      baselineTime: 0,
      lastPlayedEvent: null,
      checkpointIndex,
    };

    const service = createPlayerService(context, {
      getCastFn: () => () => {},
      applyEventsSynchronously: () => {},
      emitter: {
        on: () => {},
        emit: () => {},
      } as any,
    });
    service.start();

    return {
      service,
      getContext: () => service.state.context,
    };
  }

  it('appends a checkpoint when a Meta event is added at the end', () => {
    // Arrange
    const initialEvents: eventWithTime[] = [
      makeMetaEvent(now),
      makeFullSnapshotEvent(now + 1),
      makeIncrementalEvent(now + 100),
    ];
    const { service, getContext } = createTestService(initialEvents);

    // Act
    service.send({
      type: 'ADD_EVENT',
      payload: { event: makeMetaEvent(now + 2000) },
    });

    // Assert - new Meta is appended as the 4th event (index 3)
    const ctx = getContext();
    expect(ctx.checkpointIndex).toEqual([
      { metaEventIndex: 0, timestamp: now },
      { metaEventIndex: 3, timestamp: now + 2000 },
    ]);
  });

  it('shifts checkpoint indices when an incremental event is inserted in the middle', () => {
    // Arrange
    const initialEvents: eventWithTime[] = [
      makeMetaEvent(now),
      makeFullSnapshotEvent(now + 1),
      makeMetaEvent(now + 1000),
      makeFullSnapshotEvent(now + 1001),
    ];
    const { service, getContext } = createTestService(initialEvents);

    // Act - insert an incremental event between the two checkpoints
    service.send({
      type: 'ADD_EVENT',
      payload: { event: makeIncrementalEvent(now + 500) },
    });

    // Assert - second checkpoint's index should shift by 1
    const ctx = getContext();
    expect(ctx.checkpointIndex).toEqual([
      { metaEventIndex: 0, timestamp: now },
      { metaEventIndex: 3, timestamp: now + 1000 },
    ]);
  });

  it('does not shift checkpoint indices when an event is appended at the end', () => {
    // Arrange
    const initialEvents: eventWithTime[] = [
      makeMetaEvent(now),
      makeFullSnapshotEvent(now + 1),
      makeIncrementalEvent(now + 100),
    ];
    const { service, getContext } = createTestService(initialEvents);

    // Act - append an incremental event after all existing events
    service.send({
      type: 'ADD_EVENT',
      payload: { event: makeIncrementalEvent(now + 5000) },
    });

    // Assert - checkpoint index unchanged
    const ctx = getContext();
    expect(ctx.checkpointIndex).toEqual([
      { metaEventIndex: 0, timestamp: now },
    ]);
  });

  it('inserts a Meta event out of order and maintains sorted checkpoint index', () => {
    // Arrange - two sessions
    const initialEvents: eventWithTime[] = [
      makeMetaEvent(now),
      makeFullSnapshotEvent(now + 1),
      makeIncrementalEvent(now + 500),
      makeMetaEvent(now + 2000),
      makeFullSnapshotEvent(now + 2001),
    ];
    const { service, getContext } = createTestService(initialEvents);

    // Act - insert a Meta event between the two existing sessions (out of order)
    service.send({
      type: 'ADD_EVENT',
      payload: { event: makeMetaEvent(now + 1000) },
    });

    // Assert - checkpoint index should have 3 entries in sorted order
    const ctx = getContext();
    expect(ctx.checkpointIndex.length).toEqual(3);
    expect(ctx.checkpointIndex[0].timestamp).toEqual(now);
    expect(ctx.checkpointIndex[1].timestamp).toEqual(now + 1000);
    expect(ctx.checkpointIndex[2].timestamp).toEqual(now + 2000);
  });

  it('checkpoint index stays consistent after multiple addEvent calls', () => {
    // Arrange
    const initialEvents: eventWithTime[] = [
      makeMetaEvent(now),
      makeFullSnapshotEvent(now + 1),
    ];
    const { service, getContext } = createTestService(initialEvents);

    // Act - add several events in sequence
    service.send({
      type: 'ADD_EVENT',
      payload: { event: makeIncrementalEvent(now + 100) },
    });
    service.send({
      type: 'ADD_EVENT',
      payload: { event: makeMetaEvent(now + 1000) },
    });
    service.send({
      type: 'ADD_EVENT',
      payload: { event: makeFullSnapshotEvent(now + 1001) },
    });
    service.send({
      type: 'ADD_EVENT',
      payload: { event: makeIncrementalEvent(now + 1100) },
    });

    // Assert - verify checkpoints point to the correct Meta events
    const ctx = getContext();
    expect(ctx.checkpointIndex.length).toEqual(2);
    expect(ctx.events[ctx.checkpointIndex[0].metaEventIndex].type).toEqual(
      EventType.Meta,
    );
    expect(ctx.events[ctx.checkpointIndex[1].metaEventIndex].type).toEqual(
      EventType.Meta,
    );
    expect(ctx.checkpointIndex[0].timestamp).toEqual(now);
    expect(ctx.checkpointIndex[1].timestamp).toEqual(now + 1000);
  });
});
