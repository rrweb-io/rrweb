import { strFromU8, strToU8, unzlibSync } from 'fflate';
import { eventWithTimeAndPacker, MARK } from './base';

export function unpack<T extends { timestamp: number }>(raw: string) {
  if (typeof raw !== 'string') {
    return raw;
  }
  try {
    const e: T = JSON.parse(raw);
    if (e.timestamp) {
      return e;
    }
  } catch (error) {
    // ignore and continue
  }
  try {
    const e: eventWithTimeAndPacker<T> = JSON.parse(
      strFromU8(unzlibSync(strToU8(raw, true))),
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
}
