import { EventType } from '@rrweb/types';
import type { annotationData } from '@rrweb/types';

type CaptionSet = { start: number; action: 'set'; text: string };
export type Caption = CaptionSet | { start: number; action: 'clear' };

/** Malformed annotations have no effect on caption state. */
export function parseAnnotation(payload: unknown): annotationData | undefined {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('type' in payload) ||
    !('text' in payload)
  )
    return;
  const { type, text } = payload;
  if (type === 'caption' && (text === '' || text === null || text === false)) {
    return { type, text };
  }
  if (typeof text !== 'string' || !text.trim()) return;
  if (type === 'caption' || type === 'timelineMarker') return { type, text };
}

/** Decode the untyped annotation listener payload at the replay boundary. */
export function parseAnnotationEvent(
  event: unknown,
): annotationData | undefined {
  if (
    !event ||
    typeof event !== 'object' ||
    !('type' in event) ||
    event.type !== EventType.Annotation ||
    !('data' in event)
  )
    return;
  return parseAnnotation(event.data);
}

/** Reconstruct caption state from the latest set or clear, including on seeks. */
export function getActiveCaption(
  captions: Caption[],
  currentTime: number,
): CaptionSet | undefined {
  let low = 0;
  let high = captions.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (captions[mid].start <= currentTime) low = mid + 1;
    else high = mid;
  }
  const caption = captions[low - 1];
  return caption?.action === 'set' ? caption : undefined;
}
