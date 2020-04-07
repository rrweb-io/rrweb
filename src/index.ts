import record from './record';
import { Replayer } from './replay';
import { mirror } from './utils';

export {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from './types';
export { pack, unpack } from './packer';

const { addCustomEvent } = record;

export { record, addCustomEvent, Replayer, mirror };
