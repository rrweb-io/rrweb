import { createMachine, interpret, assign } from '@xstate/fsm';
import {
  playerConfig,
  eventWithTime,
  actionWithDelay,
  ReplayerEvents,
  EventType,
  Emitter,
} from '../types';
import { Timer, getDelay } from './timer';
import { needCastInSyncMode } from '../utils';

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
  | { type: 'BACK_TO_NORMAL' }
  | { type: 'TO_LIVE'; payload: { baselineTime?: number } }
  | {
      type: 'ADD_EVENT';
      payload: {
        event: eventWithTime;
      };
    };
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
    }
  | {
      value: 'live';
      context: PlayerContext;
    };

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
            TO_LIVE: {
              target: 'live',
              actions: ['startLive'],
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
        live: {
          on: {
            ADD_EVENT: {
              target: 'live',
              actions: ['addEvent'],
            },
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
          const needed_events = new Array<eventWithTime>();
          for (const event of events) {
            if (event.timestamp < baselineTime &&
                event.type === EventType.FullSnapshot &&
                needed_events.length > 0 &&
                needed_events[needed_events.length -1].type === EventType.Meta
               ) {
              // delete everything before Meta
              // so that we only rebuild from the latest full snapshot
              needed_events.splice(0, needed_events.length -1);
            }
            needed_events.push(event);
          }

          const actions = new Array<actionWithDelay>();
          for (const event of needed_events) {
            if (
              lastPlayedEvent &&
              (event.timestamp <= lastPlayedEvent.timestamp ||
                event === lastPlayedEvent)
            ) {
              continue;
            }
            const isSync = event.timestamp < baselineTime;
            if (isSync && !needCastInSyncMode(event)) {
              continue;
            }
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
          emitter.emit(ReplayerEvents.Flush);
          timer.addActions(actions);
          timer.start();
        },
        pause(ctx) {
          ctx.timer.clear();
        },
        startLive: assign({
          baselineTime: (ctx, event) => {
            ctx.timer.start();
            if (event.type === 'TO_LIVE' && event.payload.baselineTime) {
              return event.payload.baselineTime;
            }
            return Date.now();
          },
        }),
        addEvent: assign((ctx, machineEvent) => {
          const { baselineTime, timer, events } = ctx;
          if (machineEvent.type === 'ADD_EVENT') {
            const { event } = machineEvent.payload;
            events.push(event);
            const isSync = event.timestamp < baselineTime;
            const castFn = getCastFn(event, isSync);
            if (isSync) {
              castFn();
            } else {
              timer.addAction({
                doAction: () => {
                  castFn();
                  emitter.emit(ReplayerEvents.EventCast, event);
                },
                delay: getDelay(event, baselineTime),
              });
            }
          }
          return { ...ctx, events };
        }),
      },
    },
  );
  return interpret(playerMachine);
}
