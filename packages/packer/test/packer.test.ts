import { describe, it, expect, vi } from 'vitest';
import { pack, unpack } from '../src';
import { type eventWithTime, EventType } from '@saola.ai/rrweb-types';
import { MARK } from '../src/base';

const event: eventWithTime = {
  type: EventType.DomContentLoaded,
  data: {},
  timestamp: new Date('2020-01-01').getTime(),
};

describe('pack', () => {
  it('can pack event', () => {
    const packedData = pack(event);
    expect(packedData).toMatchSnapshot();
  });
});

describe('unpack', () => {
  it('is compatible with unpacked data 1', () => {
    const result = unpack(event as unknown as string);
    expect(result).toEqual(event);
  });

  it('is compatible with unpacked data 2', () => {
    const result = unpack(JSON.stringify(event));
    expect(result).toEqual(event);
  });

  it('stop on unknown data format', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => unpack('[""]')).toThrow('');

    expect(consoleSpy).toHaveBeenCalled();
    vi.resetAllMocks();
  });

  it('can unpack packed data', () => {
    const packedData = pack(event);
    const result = unpack(packedData);
    expect(result).toEqual({
      ...event,
      v: MARK,
    });
  });
});
