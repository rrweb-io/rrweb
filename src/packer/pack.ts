import { strFromU8, strToU8, zlibSync } from 'fflate';
import { PackFn, MARK, eventWithTimeAndPacker } from './base';

export const pack: PackFn = (event) => {
  const _e: eventWithTimeAndPacker = {
    ...event,
    v: MARK,
  };
  return strFromU8(zlibSync(strToU8(JSON.stringify(_e))), true);
};
