import { EventType } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import { parseAnnotation } from './annotations';
import type { Caption } from './annotations';
import { isUserInteraction } from './utils';

/** Consume appended events once. Late insertions rebuild to preserve replay order. */
export function createTimelineIndex() {
  let count = 0;
  let lastEvent: eventWithTime | undefined;
  let threshold: number | undefined;
  let lastActiveTime = 0;
  let state = empty();

  function empty(): {
    start: number;
    end: number;
    captions: Caption[];
    markers: { timestamp: number; tag: string; text?: string }[];
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
      (count > 0 && events[count - 1] !== lastEvent)
    ) {
      count = 0;
      state = empty();
    }
    threshold = inactiveThreshold;
    if (!count) {
      state.start = events[0]?.timestamp ?? 0;
      lastActiveTime = state.start;
    }
    for (; count < events.length; count++) {
      const event = events[count];
      if (event.type === EventType.Custom) {
        const annotation = parseAnnotation(event.data.tag, event.data.payload);
        if (annotation?.kind === 'caption') {
          const start = event.timestamp - state.start;
          state.captions.push(
            annotation.action === 'clear'
              ? { start, action: 'clear' }
              : { start, action: 'set', text: annotation.text },
          );
          if (annotation.action !== 'clear') state.hasCaptions = true;
        } else if (
          event.data.tag !== 'annotation' ||
          annotation?.kind === 'note'
        ) {
          state.markers.push({
            timestamp: event.timestamp,
            tag: event.data.tag,
            text: annotation?.kind === 'note' ? annotation.text : undefined,
          });
        }
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
