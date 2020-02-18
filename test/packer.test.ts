import { expect } from 'chai';
import { matchSnapshot } from './utils';
import { pack, unpack } from '../src/packer';
import { eventWithTime, EventType } from '../src/types';

const events: eventWithTime[] = [
  {
    type: EventType.DomContentLoaded,
    data: {},
    timestamp: new Date('2020-01-01').getTime(),
  },
];

describe('pack', () => {
  it('can pack events', () => {
    const packedData = pack(events);
    matchSnapshot(packedData, __filename, 'pack');
  });
});

describe('unpack', () => {
  it('is compatible with unpacked data 1', () => {
    const result = unpack((events as unknown) as string);
    expect(result).to.deep.equal(events);
  });

  it('is compatible with unpacked data 2', () => {
    const result = unpack(JSON.stringify(events));
    expect(result).to.deep.equal(events);
  });

  it('stop on unknown data format', () => {
    expect(() => unpack('{}')).to.throw('Unknown data format.');
  });

  it('stop on unmatched packer', () => {
    expect(() =>
      unpack(
        JSON.stringify({
          meta: {
            packer: 'dummy',
          },
        }),
      ),
    ).to.throw('These events were not packed by the pako packer.');
  });

  it('stop on unmatched packer version', () => {
    expect(() =>
      unpack(
        JSON.stringify({
          meta: {
            packer: 'pako',
            version: 2,
          },
        }),
      ),
    ).to.throw(/incompatible with current version/);
  });

  it('can unpack packed data', () => {
    const packedData = pack(events);
    const result = unpack(packedData);
    expect(result).to.deep.equal(events);
  });
});
