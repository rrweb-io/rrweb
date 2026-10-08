import { EventType } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import { parseAnnotation } from './annotations';
import type { Caption } from './annotations';
import { isUserInteraction } from './utils';

/** Consume appended events once. Late insertions rebuild to preserve replay order. */
export function createTimelineIndex() {
  let count = 0;
  const markerIds = new WeakMap<eventWithTime, string>();
  let nextMarkerId = 0;
  let markerOccurrences = new WeakMap<eventWithTime, number>();
  function markerId(event: eventWithTime) {
    let id = markerIds.get(event);
    if (id === undefined) {
      id = String(nextMarkerId++);
      markerIds.set(event, id);
    }
    // Re-adding the same event object is legal. Keep each occurrence distinct,
    // and reproduce the same suffixes when the timeline index is rebuilt.
    const occurrence = markerOccurrences.get(event) ?? 0;
    markerOccurrences.set(event, occurrence + 1);
    return `${id}:${occurrence}`;
  }
  let lastEvent: eventWithTime | undefined;
  let threshold: number | undefined;
  let lastActiveTime = 0;
  let state = empty();

  function empty(): {
    start: number;
    end: number;
    captions: Caption[];
    markers: { id: string; timestamp: number; tag?: string; text?: string }[];
    periods: [number, number][];
    hasCaptions: boolean;
  } {
    return {
      start: 0,
      end: 0,
      captions: [],
      markers: [],
      periods: [],
      hasCaptions: false,
    };
  }

  return (events: eventWithTime[], inactiveThreshold: number) => {
    if (
      threshold !== inactiveThreshold ||
      events.length < count ||
      // A repeated tail object can hide a late insertion at the old boundary.
      // Rebuild this uncommon case rather than counting an occurrence twice.
      (events.length > count &&
        lastEvent !== undefined &&
        (markerOccurrences.get(lastEvent) ?? 0) > 1) ||
      (count > 0 && events[count - 1] !== lastEvent)
    ) {
      count = 0;
      markerOccurrences = new WeakMap();
      state = empty();
    }
    threshold = inactiveThreshold;
    if (!count) {
      state.start = events[0]?.timestamp ?? 0;
      lastActiveTime = state.start;
    }
    for (; count < events.length; count++) {
      const event = events[count];
      if (event.type === EventType.Annotation) {
        const annotation = parseAnnotation(event.data);
        if (annotation?.type === 'caption') {
          const start = event.timestamp - state.start;
          state.captions.push(
            annotation.text
              ? { start, action: 'set', text: annotation.text }
              : { start, action: 'clear' },
          );
          if (annotation.text) state.hasCaptions = true;
        } else if (annotation?.type === 'timelineMarker') {
          state.markers.push({
            id: markerId(event),
            timestamp: event.timestamp,
            text: annotation.text,
          });
        }
      } else if (event.type === EventType.Custom) {
        state.markers.push({
          id: markerId(event),
          timestamp: event.timestamp,
          tag: event.data.tag,
        });
      }
      if (isUserInteraction(event)) {
        if (event.timestamp - lastActiveTime > inactiveThreshold) {
          state.periods.push([lastActiveTime, event.timestamp]);
        }
        lastActiveTime = event.timestamp;
      }
    }
    lastEvent = events[count - 1];
    state.end = lastEvent?.timestamp ?? state.start;
    return state;
  };
}
