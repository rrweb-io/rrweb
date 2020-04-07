import { deflate } from 'pako/dist/pako_deflate';
import { PackFn, MARK, eventWithTimeAndPacker } from './base';

export const pack: PackFn = (event) => {
  const _e: eventWithTimeAndPacker = {
    ...event,
    v: MARK,
  };
  return deflate(JSON.stringify(_e), { to: 'string' });
};
