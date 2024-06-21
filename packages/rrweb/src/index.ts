import record from './record';
import {
  Replayer,
  type playerConfig,
  type PlayerMachineState,
  type SpeedMachineState,
} from './replay';
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

// exports style.css from replay
import './replay/styles/style.css';

export type { recordOptions, ReplayPlugin } from './types';

const { addCustomEvent } = record;
const { freezePage } = record;

export {
  Replayer,
  addCustomEvent,
  freezePage,
  type playerConfig,
  type PlayerMachineState,
  type SpeedMachineState,
  canvasMutation,
  _mirror as mirror,
  record,
  utils,
};
