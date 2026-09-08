import type { CustomEventAnnotation } from '@rrweb/types';

type CaptionSet = { start: number; action: 'set'; text: string };
export type Caption = CaptionSet | { start: number; action: 'clear' };

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

/** Decode the untyped custom-event listener payload at the replay boundary. */
export function parseAnnotationEvent(
  event: unknown,
): CustomEventAnnotation | undefined {
  if (!event || typeof event !== 'object' || !('data' in event)) return;
  const data = event.data;
  if (
    !data ||
    typeof data !== 'object' ||
    !('tag' in data) ||
    typeof data.tag !== 'string' ||
    !('payload' in data)
  )
    return;
  return parseAnnotation(data.tag, data.payload);
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
