import { describe, expect, it } from 'vitest';
import { EventType, IncrementalSource } from '@rrweb/types';
import type { eventWithTime } from '@rrweb/types';
import { createTimelineIndex } from '../src/timeline-index';
import { getActiveCaption, getCaptions } from '../src/annotations';
import { getInactivePeriods } from '../src/utils';

const caption = (timestamp: number, text: string): eventWithTime => ({
  type: EventType.Custom,
  timestamp,
  data: { tag: 'annotation', payload: { kind: 'caption', text } },
});

describe('timeline indexing cost and ordering', () => {
  it('does not revisit 50,000 existing events when appending a batch', () => {
    let reads = 0;
    const events: eventWithTime[] = Array.from(
      { length: 50000 },
      (_, timestamp) => ({
        get type() {
          reads++;
          return EventType.Load;
        },
        timestamp,
        data: {},
      }),
    );
    const update = createTimelineIndex();
    update(events, 10000);
    reads = 0;
    events.push(caption(60000, 'New caption'));
    update(events, 10000);
    update(events, 10000);
    expect(reads).toBe(0);
  });

  it('matches a full scan after appends, equal timestamps, and late insertions', () => {
    const update = createTimelineIndex();
    const events: eventWithTime[] = [caption(1000, 'First')];
    update(events, 1000);
    events.push(caption(3000, 'Second'), caption(3000, 'Last'));
    events.push({
      type: EventType.IncrementalSnapshot,
      timestamp: 6000,
      data: {
        source: IncrementalSource.Input,
        id: 1,
        text: '',
        isChecked: false,
      },
    });
    let index = update(events, 1000);
    expect(index.captions).toEqual(getCaptions(events));
    expect(index.periods).toEqual(getInactivePeriods(events, 1000));
    events.splice(0, 0, caption(0, 'Earlier'));
    index = update(events, 1000);
    expect(index.captions).toEqual(getCaptions(events));
    expect(index.periods).toEqual(getInactivePeriods(events, 1000));
    expect(getActiveCaption(index.captions, 3000)?.text).toBe('Last');
  });

  it('uses logarithmic caption lookup even near the beginning', () => {
    let reads = 0;
    const captions = Array.from({ length: 100000 }, (_, start) => ({
      get start() {
        reads++;
        return start;
      },
      action: 'set' as const,
      text: String(start),
    }));
    expect(getActiveCaption(captions, 1)?.text).toBe('1');
    expect(reads).toBeLessThan(20);
  });
});
