import record from './record';
import { Replayer } from './replay';
import { SyncReplayer } from './replay/sync-replayer';
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
  SyncReplayer,
  _mirror as mirror,
  utils,
};
