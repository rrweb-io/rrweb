import record from './record';
import {
  Replayer,
  type playerConfig,
  type PlayerMachineState,
  type SpeedMachineState,
} from './replay';
import canvasMutation from './replay/canvas';
import { _mirror } from './utils';
import * as utils from './utils';

export {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
  type eventWithTime,
} from '@rrweb/types';

// exports style.css from replay
import './replay/styles/style.css';

export type { recordOptions, ReplayPlugin } from './types';

const { addCustomEvent } = record;
const { freezePage } = record;

export {
  record,
  addCustomEvent,
  freezePage,
  Replayer,
  type playerConfig,
  type PlayerMachineState,
  type SpeedMachineState,
  canvasMutation,
  _mirror as mirror,
  utils,
};
