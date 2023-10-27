import record from './record';
import { Replayer } from './replay';
import * as utils from './utils';

export {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from '@sentry-internal/rrweb-types';

export type {
  fullSnapshotEvent,
  incrementalSnapshotEvent,
  inputData,
  eventWithTime,
} from '@sentry-internal/rrweb-types';

export type { recordOptions } from './types';

export { record, Replayer, utils };

export { takeFullSnapshot, mirror, freezePage, addCustomEvent } from './record';
