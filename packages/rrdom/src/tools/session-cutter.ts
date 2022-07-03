import { EventType, eventWithTime } from 'rrweb/src/types';
import snapshot from './snapshot';
import { SyncReplayer } from './SyncReplayer';
type CutterConfig = {
  points: number[];
};

export function sessionCut(
  events: eventWithTime[],
  config: CutterConfig,
): eventWithTime[][] {
  // Events length is too short so that cutting process is not needed.
  if (events.length < 2) return [events];
  const { points } = config;
  if (!points || points.length == 0) return [events];

  events = events.sort((a1, a2) => a1.timestamp - a2.timestamp);
  const totalTime = events[events.length - 1].timestamp - events[0].timestamp;

  const validSortedPoints = getValidSortedPoints(points, totalTime);
  if (validSortedPoints.length < 1) return [events];
  const results: eventWithTime[][] = [];
  const replayer = new SyncReplayer(events);
  let cutPointIndex = 0;
  const baseTime = events[0].timestamp;
  const validSortedTimestamp = validSortedPoints.map(
    (point) => baseTime + point,
  );
  replayer.play(({ index, event }) => {
    if (
      event.timestamp <= validSortedTimestamp[cutPointIndex] &&
      index + 1 < events.length
    ) {
      const nextEvent = events[index + 1];
      while (
        cutPointIndex < validSortedTimestamp.length &&
        nextEvent.timestamp > validSortedTimestamp[cutPointIndex]
      ) {
        if (results.length === 0) {
          results.push(events.slice(0, index + 1));
        }
        cutPointIndex++;
        const nextCutTimestamp =
          cutPointIndex < validSortedPoints.length
            ? validSortedTimestamp[cutPointIndex]
            : events[events.length - 1].timestamp;
        const result = cutEvents(
          events.slice(index + 1),
          replayer,
          event.timestamp,
          nextCutTimestamp,
        );
        results.push(result);
      }
      return cutPointIndex < validSortedTimestamp.length;
    }
  });
  return results;
}

function cutEvents(
  events: eventWithTime[],
  replayer: SyncReplayer,
  currentTimestamp: number,
  endTimestamp: number,
) {
  const result: eventWithTime[] = [];
  if (replayer.latestMetaEvent) {
    const metaEvent = replayer.latestMetaEvent;
    metaEvent.timestamp = currentTimestamp;
    result.push(metaEvent);
  }
  result.push(
    ...replayer.unhandledEvents.map((e) => {
      e.timestamp = currentTimestamp + 10;
      return e;
    }),
  );
  const fullSnapshot = snapshot(replayer.virtualDom, {
    mirror: replayer.getMirror(),
  });
  if (fullSnapshot)
    result.push({
      type: EventType.FullSnapshot,
      data: {
        node: fullSnapshot,
        initialOffset: {
          top: 0,
          left: 0,
        },
      },
      timestamp: currentTimestamp,
    });
  result.push(...events.filter((event) => event.timestamp <= endTimestamp));
  return result;
}

function getValidSortedPoints(points: number[], totalTime: number) {
  const validSortedPoints = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point <= 0 || point >= totalTime) continue;
    validSortedPoints.push(point);
  }
  return validSortedPoints.sort();
}
