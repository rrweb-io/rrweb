import { strFromU8, strToU8, zlibSync } from 'fflate';
import { MARK, eventWithTimeAndPacker } from './base';

export function pack<T extends { timestamp: number }>(event: T) {
  const _e: eventWithTimeAndPacker<T> = {
    ...event,
    v: MARK,
  };
  return strFromU8(zlibSync(strToU8(JSON.stringify(_e))), true);
}
