import record from './record';
import { Replayer } from './replay';
import { mirror } from './utils';
import { pack, unpack } from './packer';

export {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from './types';

const { addCustomEvent } = record;

export { record, addCustomEvent, Replayer, mirror };
