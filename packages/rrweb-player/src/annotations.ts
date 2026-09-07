import { EventType } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';

/** Payloads for custom events with the tag `annotation`. Text is plain text. */
export type CustomEventAnnotation =
  | { kind: 'caption'; action?: 'set'; text: string }
  | { kind: 'caption'; action: 'clear' }
  | { kind: 'note'; text: string };

type CaptionSet = { start: number; action: 'set'; text: string };
type Caption = CaptionSet | { start: number; action: 'clear' };

/** Other tags and malformed annotations have no effect on caption state. */
export function parseAnnotation(
  tag: string,
  payload: unknown,
): CustomEventAnnotation | undefined {
  if (
    tag !== 'annotation' ||
    typeof payload !== 'object' ||
    payload === null ||
    !('kind' in payload)
  ) {
    return undefined;
  }
  const action = 'action' in payload ? payload.action : undefined;
  if (payload.kind === 'caption' && action === 'clear') {
    return { kind: 'caption', action: 'clear' };
  }
  if (
    !('text' in payload) ||
    typeof payload.text !== 'string' ||
    !payload.text.trim()
  ) {
    return undefined;
  }
  if (
    payload.kind === 'caption' &&
    (action === undefined || action === 'set')
  ) {
    return { kind: 'caption', action: 'set', text: payload.text };
  }
  if (payload.kind === 'note' && action === undefined) {
    return { kind: 'note', text: payload.text };
  }
  return undefined;
}

/** Replayer events are unpacked and sorted by timestamp. */
export function getCaptions(events: eventWithTime[]): Caption[] {
  const startTime = events[0]?.timestamp;
  if (startTime === undefined) return [];
  const captions: Caption[] = [];
  for (const event of events) {
    if (event.type !== EventType.Custom) continue;
    const annotation = parseAnnotation(event.data.tag, event.data.payload);
    if (annotation?.kind !== 'caption') continue;
    const start = event.timestamp - startTime;
    captions.push(
      annotation.action === 'clear'
        ? { start, action: 'clear' }
        : { start, action: 'set', text: annotation.text },
    );
  }
  return captions;
}

/** Reconstruct caption state from the latest set or clear, including on seeks. */
export function getActiveCaption(
  captions: Caption[],
  currentTime: number,
): CaptionSet | undefined {
  for (let i = captions.length - 1; i >= 0; i--) {
    const caption = captions[i];
    if (caption.start <= currentTime) {
      return caption.action === 'set' ? caption : undefined;
    }
  }
  return undefined;
}
