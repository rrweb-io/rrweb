import { type eventWithTime, EventType } from '@amplitude/rrweb-types';

export interface SnapshotCheckpoint {
  metaEventIndex: number;
  timestamp: number;
}

/**
 * Build a sorted index of all Meta event positions in the events array.
 * Called once at construction time. O(N) in total events.
 */
export function buildCheckpointIndex(
  events: eventWithTime[],
): SnapshotCheckpoint[] {
  const checkpoints: SnapshotCheckpoint[] = [];
  for (let i = 0; i < events.length; i++) {
    if (events[i].type === EventType.Meta) {
      checkpoints.push({
        metaEventIndex: i,
        timestamp: events[i].timestamp,
      });
    }
  }
  return checkpoints;
}

/**
 * Binary search for the last checkpoint whose timestamp <= baselineTime.
 * O(log C) where C is the number of checkpoints.
 * Returns null if no checkpoint is at or before baselineTime.
 */
export function findNearestCheckpoint(
  checkpoints: SnapshotCheckpoint[],
  baselineTime: number,
): SnapshotCheckpoint | null {
  if (checkpoints.length === 0) {
    return null;
  }

  let lo = 0;
  let hi = checkpoints.length - 1;
  let result: SnapshotCheckpoint | null = null;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (checkpoints[mid].timestamp <= baselineTime) {
      result = checkpoints[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return result;
}
