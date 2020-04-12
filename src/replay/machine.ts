import {
  createMachine,
  EventObject,
  Typestate,
  InterpreterStatus,
  StateMachine,
} from '@xstate/fsm';
import { playerConfig, eventWithTime } from '../types';

type PlayerContext = {
  events: eventWithTime[];
  timeOffset: number;
  speed: playerConfig['speed'];
};
type PlayerEvent =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'END' }
  | { type: 'REPLAY' }
  | { type: 'FAST_FORWARD' }
  | { type: 'BACK_TO_NORMAL' };
type PlayerState =
  | {
      value: 'inited';
      context: PlayerContext;
    }
  | {
      value: 'playing';
      context: PlayerContext;
    }
  | {
      value: 'paused';
      context: PlayerContext;
    }
  | {
      value: 'ended';
      context: PlayerContext;
    }
  | {
      value: 'skipping';
      context: PlayerContext;
    };

// TODO: import interpret when this relased
// https://github.com/davidkpiano/xstate/issues/1080
// tslint:disable no-any
function toEventObject<TEvent extends EventObject>(
  event: TEvent['type'] | TEvent,
): TEvent {
  return (typeof event === 'string' ? { type: event } : event) as TEvent;
}
const INIT_EVENT = { type: 'xstate.init' };
const executeStateActions = <
  TContext extends object,
  TEvent extends EventObject = any,
  TState extends Typestate<TContext> = any
>(
  state: StateMachine.State<TContext, TEvent, TState>,
  event: TEvent | typeof INIT_EVENT,
) =>
  state.actions.forEach(
    ({ exec }) => exec && exec(state.context, event as any),
  );
function interpret<
  TContext extends object,
  TEvent extends EventObject = EventObject,
  TState extends Typestate<TContext> = any
>(
  machine: StateMachine.Machine<TContext, TEvent, TState>,
): StateMachine.Service<TContext, TEvent, TState> {
  let state = machine.initialState;
  let status = InterpreterStatus.NotStarted;
  const listeners = new Set<StateMachine.StateListener<typeof state>>();

  const service = {
    _machine: machine,
    send: (event: TEvent | TEvent['type']): void => {
      if (status !== InterpreterStatus.Running) {
        return;
      }
      state = machine.transition(state, event);
      executeStateActions(state, toEventObject(event));
      listeners.forEach((listener) => listener(state));
    },
    subscribe: (listener: StateMachine.StateListener<typeof state>) => {
      listeners.add(listener);
      listener(state);

      return {
        unsubscribe: () => listeners.delete(listener),
      };
    },
    start: () => {
      status = InterpreterStatus.Running;
      executeStateActions(state, INIT_EVENT);
      return service;
    },
    stop: () => {
      status = InterpreterStatus.Stopped;
      listeners.clear();
      return service;
    },
    get state() {
      return state;
    },
    get status() {
      return status;
    },
  };

  return service;
}

export function createPlayerService(context: PlayerContext) {
  const playerMachine = createMachine<PlayerContext, PlayerEvent, PlayerState>({
    id: 'player',
    context,
    initial: 'inited',
    states: {
      inited: {
        on: {
          PLAY: 'playing',
        },
      },
      playing: {
        on: {
          PAUSE: 'paused',
          END: 'ended',
          FAST_FORWARD: 'skipping',
        },
      },
      paused: {
        on: {
          RESUME: 'playing',
        },
      },
      skipping: {
        on: {
          BACK_TO_NORMAL: 'playing',
        },
      },
      ended: {
        on: {
          REPLAY: 'playing',
        },
      },
    },
  });
  return interpret(playerMachine);
}
