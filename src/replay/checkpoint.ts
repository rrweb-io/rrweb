import { eventWithTime, EventType, checkpointList, checkpoint } from '../types';

const INTERVAL = 100;
export function calcCheckpoints(events: eventWithTime[]): number[] {
  const idxs: number[] = [];
  let lastCheckpointIdx: number = -1;
  for (let idx = 0; idx < events.length; idx++) {
    const exceeded = idx - lastCheckpointIdx > INTERVAL;
    if (events[idx].type === EventType.FullSnapshot || exceeded) {
      lastCheckpointIdx = idx;
      idxs.push(idx);
    }
  }
  return idxs;
}

export function findCheckpoint(
  checkpointList: checkpointList,
  timestamp: number,
): checkpoint {
  let start = 0;
  let end = checkpointList.length - 1;
  while (start <= end) {
    let mid = Math.floor((start + end) / 2);
    if (checkpointList[mid].timestamp > timestamp) {
      end = mid - 1;
    } else if (checkpointList[mid].timestamp === timestamp) {
      console.log('idx', mid);
      return checkpointList[mid];
    } else if (end - start < 2) {
      console.log('idx', start, end);
      return checkpointList[end].timestamp <= timestamp
        ? checkpointList[end]
        : checkpointList[start];
    } else {
      start = mid;
    }
  }
  return checkpointList[start];
}
