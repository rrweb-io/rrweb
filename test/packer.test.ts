import { expect } from 'chai';
import { matchSnapshot } from './utils';
import { pack, unpack } from '../src/packer';
import { eventWithTime, EventType } from '../src/types';
import { MARK } from '../src/packer/base';

const event: eventWithTime = {
  type: EventType.DomContentLoaded,
  data: {},
  timestamp: new Date('2020-01-01').getTime(),
};

describe('pack', () => {
  it('can pack event', () => {
    const packedData = pack(event);
    const result = matchSnapshot(packedData, __filename, 'pack');
    expect(result.pass).to.true;
  });
});

describe('unpack', () => {
  it('is compatible with unpacked data 1', () => {
    const result = unpack((event as unknown) as string);
    expect(result).to.deep.equal(event);
  });

  it('is compatible with unpacked data 2', () => {
    const result = unpack(JSON.stringify(event));
    expect(result).to.deep.equal(event);
  });

  it('stop on unknown data format', () => {
    expect(() => unpack('[""]')).to.throw('');
  });

  it('can unpack packed data', () => {
    const packedData = pack(event);
    const result = unpack(packedData);
    expect(result).to.deep.equal({
      ...event,
      v: MARK,
    });
  });
});
