import record from './record';
import { Replayer } from './replay';
import canvasMutation from './replay/canvas';
import * as utils from './utils';
import { _mirror } from './utils';

export {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
  type eventWithTime,
} from '@amplitude/rrweb-types';

export type { recordOptions } from './types';

const { addCustomEvent } = record;
const { freezePage } = record;

export {
  Replayer,
  addCustomEvent,
  freezePage,
  canvasMutation,
  _mirror as mirror,
  record,
  utils,
};
