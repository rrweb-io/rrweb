import record from './record';
import { Replayer } from './replay';
import * as utils from './utils';
import { _mirror } from './utils';

export {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from '@amplitude/rrweb-types';

export type { recordOptions } from './types';

const { addCustomEvent } = record;
const { freezePage } = record;

export {
  Replayer,
  addCustomEvent,
  freezePage,
  _mirror as mirror,
  record,
  utils,
};
