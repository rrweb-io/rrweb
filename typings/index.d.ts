import record from './record';
import { Replayer } from './replay';
import { mirror } from './utils';
export { EventType, IncrementalSource, MouseInteractions, ReplayerEvents, } from './types';
export { pack, unpack } from './packer';
declare const addCustomEvent: <T>(tag: string, payload: T) => void;
export { record, addCustomEvent, Replayer, mirror };
