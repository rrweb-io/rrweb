import { inflate } from 'pako';
import { UnpackFn, eventWithTimeAndPacker, MARK } from './base';
import { eventWithTime } from '../types';

export const unpack: UnpackFn = (raw: string) => {
  if (typeof raw !== 'string') {
    return raw;
  }
  try {
    const e: eventWithTime = JSON.parse(raw);
    if (e.timestamp) {
      return e;
    }
  } catch (error) {
    // ignore and continue
  }
  try {
    const e: eventWithTimeAndPacker = JSON.parse(
      inflate(raw, { to: 'string' }),
    );
    if (e.v === MARK) {
      return e;
    }
    throw new Error(
      `These events were packed with packer ${e.v} which is incompatible with current packer ${MARK}.`,
    );
  } catch (error) {
    console.error(error);
    throw new Error('Unknown data format.');
  }
};
