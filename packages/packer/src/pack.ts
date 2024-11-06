import { strFromU8, strToU8, zlibSync } from 'fflate';
import type { PackFn } from '@saola.ai/rrweb-types';
import { type eventWithTimeAndPacker, MARK } from './base';

export const pack: PackFn = (event) => {
  const _e: eventWithTimeAndPacker = {
    ...event,
    v: MARK,
  };
  return strFromU8(zlibSync(strToU8(JSON.stringify(_e))), true);
};
