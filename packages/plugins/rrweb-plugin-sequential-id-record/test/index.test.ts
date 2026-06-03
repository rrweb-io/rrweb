import { describe, expect, it } from 'vitest';
import type { eventWithTime } from '@rrweb/types';
import { getRecordSequentialIdPlugin } from '../src/index';

function event(sequenceId?: unknown): eventWithTime & { sequenceId?: unknown } {
  const e: eventWithTime & { sequenceId?: unknown } = {
    timestamp: 1,
    type: 5,
    data: {
      tag: 'test',
      payload: {},
    },
  };
  if (sequenceId !== undefined) {
    e.sequenceId = sequenceId;
  }
  return e;
}

describe('getRecordSequentialIdPlugin', () => {
  it('keeps default behavior of assigning 1 then 2', () => {
    const plugin = getRecordSequentialIdPlugin({ key: 'sequenceId' });

    expect(plugin.eventProcessor?.(event())).toMatchObject({ sequenceId: 1 });
    expect(plugin.eventProcessor?.(event())).toMatchObject({ sequenceId: 2 });
  });

  it('starts generated ids after startId', () => {
    const plugin = getRecordSequentialIdPlugin({
      key: 'sequenceId',
      startId: 10,
    });

    expect(plugin.eventProcessor?.(event())).toMatchObject({ sequenceId: 11 });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5])(
    'treats invalid startId %s as 0',
    (startId) => {
      const plugin = getRecordSequentialIdPlugin({
        key: 'sequenceId',
        startId,
      });

      expect(plugin.eventProcessor?.(event())).toMatchObject({
        sequenceId: 1,
      });
    },
  );

  it('overwrites an existing key by default', () => {
    const plugin = getRecordSequentialIdPlugin({ key: 'sequenceId' });

    expect(plugin.eventProcessor?.(event(50))).toMatchObject({
      sequenceId: 1,
    });
  });

  it('preserves existing positive integer ids and advances the counter', () => {
    const plugin = getRecordSequentialIdPlugin({
      key: 'sequenceId',
      preserveExisting: true,
    });

    expect(plugin.eventProcessor?.(event(50))).toMatchObject({
      sequenceId: 50,
    });
    expect(plugin.eventProcessor?.(event())).toMatchObject({
      sequenceId: 51,
    });
  });

  it.each([0, -1, 1.5, Number.NaN, '2'])(
    'replaces invalid existing id %s when preserving existing ids',
    (sequenceId) => {
      const plugin = getRecordSequentialIdPlugin({
        key: 'sequenceId',
        preserveExisting: true,
      });

      expect(plugin.eventProcessor?.(event(sequenceId))).toMatchObject({
        sequenceId: 1,
      });
    },
  );
});
