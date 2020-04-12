import {
  createMachine,
  EventObject,
  Typestate,
  InterpreterStatus,
  StateMachine,
  assign,
} from '@xstate/fsm';
import {
  playerConfig,
  eventWithTime,
  actionWithDelay,
  ReplayerEvents,
  Emitter,
} from '../types';
import { Timer, getDelay } from './timer';

export type PlayerContext = {
  events: eventWithTime[];
  timer: Timer;
  speed: playerConfig['speed'];
  timeOffset: number;
  baselineTime: number;
  lastPlayedEvent: eventWithTime | null;
};
export type PlayerEvent =
  | {
      type: 'PLAY';
      payload: {
        timeOffset: number;
      };
    }
  | {
      type: 'CAST_EVENT';
      payload: {
        event: eventWithTime;
      };
    }
  | { type: 'PAUSE' }
  | {
      type: 'RESUME';
      payload: {
        timeOffset: number;
      };
    }
  | { type: 'END' }
  | { type: 'REPLAY' }
  | { type: 'FAST_FORWARD' }
  | { type: 'BACK_TO_NORMAL' };
export type PlayerState =
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

type PlayerAssets = {
  emitter: Emitter;
  getCastFn(event: eventWithTime, isSync: boolean): () => void;
};
export function createPlayerService(
  context: PlayerContext,
  { getCastFn, emitter }: PlayerAssets,
) {
  const playerMachine = createMachine<PlayerContext, PlayerEvent, PlayerState>(
    {
      id: 'player',
      context,
      initial: 'inited',
      states: {
        inited: {
          on: {
            PLAY: {
              target: 'playing',
              actions: ['recordTimeOffset', 'play'],
            },
          },
        },
        playing: {
          on: {
            PAUSE: {
              target: 'paused',
              actions: ['pause'],
            },
            END: 'ended',
            FAST_FORWARD: 'skipping',
            CAST_EVENT: {
              target: 'playing',
              actions: 'castEvent',
            },
          },
        },
        paused: {
          on: {
            RESUME: {
              target: 'playing',
              actions: ['recordTimeOffset', 'play'],
            },
            CAST_EVENT: {
              target: 'paused',
              actions: 'castEvent',
            },
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
    },
    {
      actions: {
        castEvent: assign({
          lastPlayedEvent: (ctx, event) => {
            if (event.type === 'CAST_EVENT') {
              return event.payload.event;
            }
            return context.lastPlayedEvent;
          },
        }),
        recordTimeOffset: assign((ctx, event) => {
          let timeOffset = ctx.timeOffset;
          if ('payload' in event && 'timeOffset' in event.payload) {
            timeOffset = event.payload.timeOffset;
          }
          return {
            ...ctx,
            timeOffset,
            baselineTime: ctx.events[0].timestamp + timeOffset,
          };
        }),
        play(ctx) {
          const { timer, events, baselineTime, lastPlayedEvent } = ctx;
          timer.clear();
          const actions = new Array<actionWithDelay>();
          for (const event of events) {
            if (
              lastPlayedEvent &&
              (event.timestamp <= lastPlayedEvent.timestamp ||
                event === lastPlayedEvent)
            ) {
              continue;
            }
            const isSync = event.timestamp < baselineTime;
            const castFn = getCastFn(event, isSync);
            if (isSync) {
              castFn();
            } else {
              actions.push({
                doAction: () => {
                  castFn();
                  emitter.emit(ReplayerEvents.EventCast, event);
                },
                delay: getDelay(event, baselineTime),
              });
            }
          }
          timer.addActions(actions);
          timer.start();
        },
        pause(ctx) {
          ctx.timer.clear();
        },
      },
    },
  );
  return interpret(playerMachine);
}
