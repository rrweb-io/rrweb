import record from './record';
import { Replayer } from './replay';
import { _mirror } from './utils';
import * as utils from './utils';

export {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from './types';

const { addCustomEvent } = record;
const { freezePage } = record;

export {
  record,
  addCustomEvent,
  freezePage,
  Replayer,
  _mirror as mirror,
  utils,
};
