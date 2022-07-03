import type { eventWithTime } from 'rrweb/src/types';
type CutterConfig = {
  points: number[];
};
export function sessionCut(events: eventWithTime[], config: CutterConfig) {
  // Events length is too short so that cutting process is not needed.
  if (events.length < 2) return events;
  const { points } = config;
  if (!points || points.length == 0) return events;
  const totalTime = events[events.length - 1].timestamp - events[0].timestamp;

  const validSortedPoints = getValidSortedPoints(points, totalTime);

  return;
}

function vitualPlay(
  events: eventWithTime[],
  pausePoints: number[],
  callback: () => void,
) {
  
}

function getValidSortedPoints(points: number[], totalTime: number) {
  const validSortedPoints = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point <= 0 || point > totalTime) continue;
    validSortedPoints.push(point);
  }
  return validSortedPoints.sort();
}
