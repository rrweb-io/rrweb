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
const event = (timestamp: number, data: unknown): eventWithTime =>
  ({
    type: EventType.Annotation,
    timestamp,
    data,
  } as eventWithTime);

describe('annotations', () => {
  it('validates the annotation event envelope', () => {
    for (const value of [
      null,
      undefined,
      5,
      {},
      { data: null },
      { type: EventType.Custom, data: { type: 'caption', text: 'Wrong' } },
      { data: { type: 'caption', text: 'Wrong' } },
    ]) {
      expect(parseAnnotationEvent(value)).toBeUndefined();
    }
    expect(
      parseAnnotationEvent(event(0, { type: 'caption', text: 'Hello' })),
    ).toEqual({ type: 'caption', text: 'Hello' });
  });
  it('accepts plain caption and timeline marker text', () => {
    for (const type of ['caption', 'timelineMarker']) {
      expect(parseAnnotation({ type, text: 'Save\n<b>project</b>' })).toEqual({
        type,
        text: 'Save\n<b>project</b>',
      });
    }
  });
  it.each(['', null, false])('accepts caption clearing with %j', (text) => {
    expect(parseAnnotation({ type: 'caption', text })).toEqual({
      type: 'caption',
      text,
    });
    const captions = indexCaptions([
      event(0, { type: 'caption', text: 'Hello' }),
      event(1000, { type: 'caption', text }),
    ]);
    expect(getActiveCaption(captions, 999)?.text).toBe('Hello');
    expect(getActiveCaption(captions, 1000)).toBeUndefined();
  });
  it.each([
    undefined,
    null,
    1,
    'marker text',
    [],
    {},
    { text: 'legacy' },
    { type: 'unknown', text: 'marker text' },
    { type: 'caption' },
    { type: 'caption', text: ' \n ' },
    { type: 'caption', text: 1 },
    { type: 'caption', text: 0 },
    { type: 'caption', text: true },
    { kind: 'caption', action: 'clear' },
    { type: 'timelineMarker', text: '' },
    { type: 'timelineMarker', text: null },
    { type: 'timelineMarker', text: false },
  ])('ignores malformed annotations: %j', (payload) => {
    expect(parseAnnotation(payload)).toBeUndefined();
  });
  it('persists until replacement or clear, using recording-relative time', () => {
    const captions = indexCaptions([
      { type: EventType.Load, timestamp: 1000, data: {} },
      event(2000, { type: 'caption', text: 'First' }),
      event(3000, { type: 'timelineMarker', text: 'A timeline marker' }),
      event(4000, { type: 'caption', text: 'Second' }),
      event(5000, { type: 'caption', text: null }),
      event(6000, { type: 'caption', text: 'Third' }),
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
      event(1000, { type: 'caption', text: 'First' }),
      event(1000, { type: 'caption', text: null }),
      event(2000, { type: 'caption', text: null }),
      event(2000, { type: 'caption', text: 'Second' }),
      event(2500, { type: 'caption', text: 123 }),
      {
        type: EventType.Custom,
        timestamp: 2600,
        data: { tag: 'annotation', payload: { type: 'caption', text: null } },
      },
    ]);
    expect(getActiveCaption(captions, 0)).toBeUndefined();
    expect(getActiveCaption(captions, 1000)?.text).toBe('Second');
    expect(getActiveCaption(captions, 2000)?.text).toBe('Second');
  });
  it('handles empty recordings and clear before set', () => {
    expect(getActiveCaption(indexCaptions([]), 0)).toBeUndefined();
    expect(
      getActiveCaption(
        indexCaptions([event(1000, { type: 'caption', text: null })]),
        0,
      ),
    ).toBeUndefined();
  });
});
