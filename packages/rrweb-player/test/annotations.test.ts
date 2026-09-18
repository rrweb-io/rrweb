import { describe, expect, it } from 'vitest';
import { EventType } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import {
  getActiveCaption,
  parseAnnotationEvent,
  parseAnnotation,
} from '../src/annotations';
import { createTimelineIndex } from '../src/timeline-index';

const indexCaptions = (events: eventWithTime[]) =>
  createTimelineIndex()(events, 10000).captions;

const event = (
  timestamp: number,
  payload: unknown,
  tag = 'annotation',
): eventWithTime => ({
  type: EventType.Custom,
  timestamp,
  data: { tag, payload },
});

describe('custom event annotations', () => {
  it('validates custom-event listener envelopes before parsing their payload', () => {
    for (const value of [
      null,
      undefined,
      5,
      {},
      { data: null },
      { data: { tag: 1 } },
      { data: { tag: 'annotation' } },
    ]) {
      expect(parseAnnotationEvent(value)).toBeUndefined();
    }
    expect(
      parseAnnotationEvent(event(0, { kind: 'caption', text: 'Hello' })),
    ).toEqual({ kind: 'caption', action: 'set', text: 'Hello' });
  });

  it.each([undefined, 'set'])(
    'defaults caption action to set: %s',
    (action) => {
      expect(
        parseAnnotation('annotation', {
          kind: 'caption',
          action,
          text: 'Save\n<b>project</b>',
        }),
      ).toEqual({
        kind: 'caption',
        action: 'set',
        text: 'Save\n<b>project</b>',
      });
    },
  );
  it('accepts explicit clearing without text and independent notes', () => {
    expect(
      parseAnnotation('annotation', { kind: 'caption', action: 'clear' }),
    ).toEqual({ kind: 'caption', action: 'clear' });
    expect(
      parseAnnotation('annotation', { kind: 'note', text: 'A note' }),
    ).toEqual({ kind: 'note', text: 'A note' });
  });
  it.each([
    undefined,
    null,
    1,
    'note',
    [],
    {},
    { text: 'legacy', durationMs: 4000 },
    { kind: 'unknown', text: 'note' },
    { kind: 'caption' },
    { kind: 'caption', text: '' },
    { kind: 'caption', text: ' \n ' },
    { kind: 'caption', text: 1 },
    { kind: 'caption', action: 'unknown', text: 'note' },
    { kind: 'caption', action: null, text: 'note' },
    { kind: 'note', text: '' },
    { kind: 'note', action: 'clear', text: 'note' },
  ])('ignores malformed annotation payloads: %j', (payload) => {
    expect(parseAnnotation('annotation', payload)).toBeUndefined();
  });
  it('requires the annotation tag', () => {
    expect(
      parseAnnotation('ordinary', { kind: 'caption', text: 'Unrelated' }),
    ).toBeUndefined();
  });
  it('persists until replacement or clear, using recording-relative time', () => {
    const captions = indexCaptions([
      { type: EventType.Load, timestamp: 1000, data: {} },
      event(2000, { kind: 'caption', text: 'First' }),
      event(3000, { kind: 'note', text: 'A note' }),
      event(4000, { kind: 'caption', text: 'Second' }),
      event(5000, { kind: 'caption', action: 'clear' }),
      event(6000, { kind: 'caption', text: 'Third' }),
    ]);
    expect(getActiveCaption(captions, 999)).toBeUndefined();
    expect(getActiveCaption(captions, 1000)?.text).toBe('First');
    expect(getActiveCaption(captions, 2999)?.text).toBe('First');
    expect(getActiveCaption(captions, 3000)?.text).toBe('Second');
    expect(getActiveCaption(captions, 4000)).toBeUndefined();
    expect(getActiveCaption(captions, 4999)).toBeUndefined();
    expect(getActiveCaption(captions, 100000)?.text).toBe('Third');
    expect(getActiveCaption(captions, 3500)?.text).toBe('Second');
    expect(getActiveCaption(captions, 0)).toBeUndefined();
  });
  it('uses the last caption action at identical timestamps and ignores invalid actions', () => {
    const captions = indexCaptions([
      event(1000, { kind: 'caption', text: 'First' }),
      event(1000, { kind: 'caption', action: 'clear' }),
      event(2000, { kind: 'caption', action: 'clear' }),
      event(2000, { kind: 'caption', text: 'Second' }),
      event(2500, { kind: 'caption', action: 'invalid', text: 'Wrong' }),
      event(2600, { kind: 'caption', action: 'clear' }, 'ordinary'),
    ]);
    expect(getActiveCaption(captions, 0)).toBeUndefined();
    expect(getActiveCaption(captions, 1000)?.text).toBe('Second');
    expect(getActiveCaption(captions, 2000)?.text).toBe('Second');
  });
  it('handles empty recordings and clear before set', () => {
    expect(getActiveCaption(indexCaptions([]), 0)).toBeUndefined();
    expect(
      getActiveCaption(
        indexCaptions([event(1000, { kind: 'caption', action: 'clear' })]),
        0,
      ),
    ).toBeUndefined();
  });
});
