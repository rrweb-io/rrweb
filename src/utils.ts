import { Mirror } from './types';

export const mirror: Mirror = {
  map: {},
  getId(n) {
    return n.__sn && n.__sn.id;
  },
  getNode(id) {
    return mirror.map[id];
  },
};
