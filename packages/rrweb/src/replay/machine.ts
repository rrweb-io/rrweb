import {
  createMachine,
  interpret,
  assign,
  type StateMachine,
} from '@xstate/fsm';
import type { playerConfig } from '../types';
import {
  type eventWithTime,
  ReplayerEvents,
  EventType,
  type Emitter,
  IncrementalSource,
} from '@rrweb/types';
import { Timer, addDelay } from './timer';

export type PlayerContext = {
  events: eventWithTime[];
  timer: Timer;
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
  | { type: 'TO_LIVE'; payload: { baselineTime?: number } }
  | {
      type: 'STALL';
    }
  | {
      type: 'RESCHEDULE';
    }
  | {
      type: 'END';
    };
export type PlayerState =
  | {
      value: 'playing';
      context: PlayerContext;
    }
  | {
      value: 'paused';
      context: PlayerContext;
    }
  | {
      value: 'stalled';
      context: PlayerContext;
    }
  | {
      value: 'live';
      context: PlayerContext;
    };

/**
 * If the array have multiple meta and fullsnapshot events,
 * return the events from last meta to the end.
 */
export function discardPriorSnapshots(
  events: eventWithTime[],
  baselineTime: number,
): eventWithTime[] {
  for (let idx = events.length - 1; idx >= 0; idx--) {
    const event = events[idx];
    if (event.type === EventType.Meta) {
      if (event.timestamp <= baselineTime) {
        return events.slice(idx);
      }
    }
  }
  return events;
}

type PlayerAssets = {
  emitter: Emitter;
  applyEventsSynchronously(events: Array<eventWithTime>): void;
  getCastFn(event: eventWithTime, isSync: boolean): () => void;
  isStallMarker(event: eventWithTime): boolean;
};
export function createPlayerService(
  context: PlayerContext,
  { getCastFn, applyEventsSynchronously, emitter, isStallMarker }: PlayerAssets,
) {
  let nextStallTimestamp: number | null = null;
  const scheduleEvents = (
    ctx: PlayerContext,
    events: eventWithTime[],
    startIndex: number,
  ) => {
    const { timer, baselineTime } = ctx;
    for (let i = startIndex; i < events.length; i++) {
      const event = events[i];
      addDelay(event, baselineTime);
      if (isStallMarker(event)) {
        nextStallTimestamp = event.timestamp;
        timer.addAction({
          doAction: () => undefined, // keep the timer alive
          delay: event.delay!,
        });
        return;
      }
      const castFn = getCastFn(event, false);
      timer.addAction({
        doAction: () => {
          castFn();
        },
        delay: event.delay!,
      });
    }
  };
  const playerMachine = createMachine<PlayerContext, PlayerEvent, PlayerState>(
    {
      id: 'player',
      context,
      initial: 'paused',
      states: {
        playing: {
          on: {
            PLAY: {
              target: 'playing',
              actions: ['recordTimeOffset', 'play'],
            },
            PAUSE: {
              target: 'paused',
              actions: ['pause'],
            },
            CAST_EVENT: {
              target: 'playing',
              actions: 'castEvent',
            },
            END: [
              {
                target: 'stalled',
                cond: () => nextStallTimestamp !== null,
              },
              {
                target: 'paused',
                actions: ['resetLastPlayedEvent', 'pause'],
              },
            ],
            STALL: {
              target: 'stalled',
            },
            RESCHEDULE: {
              target: 'playing',
              actions: ['extendPlay'],
            },
          },
        },
        paused: {
          on: {
            PLAY: {
              target: 'playing',
              actions: ['recordTimeOffset', 'play'],
            },
            CAST_EVENT: {
              target: 'paused',
              actions: 'castEvent',
            },
            STALL: {
              target: 'stalled',
            },
            TO_LIVE: {
              target: 'live',
              actions: ['startLive'],
            },
          },
        },
        stalled: {
          entry: ['pause', 'stallStart'],
          exit: ['stallEnd'],
          on: {
            PLAY: {
              target: 'playing',
              actions: ['recordTimeOffset', 'play'],
            },
            PAUSE: {
              target: 'paused',
              actions: ['pause'],
            },
            CAST_EVENT: {
              actions: 'castEvent',
            },
          },
        },
        live: {
          on: {
            CAST_EVENT: {
              target: 'live',
              actions: ['castEvent'],
            },
          },
        },
      },
    },
    {
      actions: {
        stallStart: () => emitter.emit(ReplayerEvents.StallStart),
        stallEnd: () => emitter.emit(ReplayerEvents.StallEnd),
        castEvent: assign({
          lastPlayedEvent: (ctx, event) => {
            if (event.type === 'CAST_EVENT') {
              return event.payload.event;
            }
            return ctx.lastPlayedEvent;
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
          nextStallTimestamp = null;

          for (const event of events) {
            // TODO: improve this API
            addDelay(event, baselineTime);
          }
          const neededEvents = discardPriorSnapshots(events, baselineTime);

          let lastPlayedTimestamp = lastPlayedEvent?.timestamp;
          if (
            lastPlayedEvent?.type === EventType.IncrementalSnapshot &&
            lastPlayedEvent.data.source === IncrementalSource.MouseMove
          ) {
            lastPlayedTimestamp =
              lastPlayedEvent.timestamp +
              lastPlayedEvent.data.positions[0]?.timeOffset;
          }
          if (baselineTime < (lastPlayedTimestamp || 0)) {
            emitter.emit(ReplayerEvents.PlayBack);
          }

          const syncEvents = new Array<eventWithTime>();
          let tailStart = neededEvents.length;
          for (let i = 0; i < neededEvents.length; i++) {
            const event = neededEvents[i];
            if (
              lastPlayedTimestamp &&
              lastPlayedTimestamp < baselineTime &&
              (event.timestamp <= lastPlayedTimestamp ||
                event === lastPlayedEvent)
            ) {
              continue;
            }
            if (isStallMarker(event)) {
              tailStart = i;
              break;
            }
            if (event.timestamp < baselineTime) {
              syncEvents.push(event);
            } else {
              tailStart = i;
              break;
            }
          }
          applyEventsSynchronously(syncEvents);
          scheduleEvents(ctx, neededEvents, tailStart);
          emitter.emit(ReplayerEvents.Flush);
          timer.start();
          return;
        },
        extendPlay(ctx) {
          const { events } = ctx;
          const from = nextStallTimestamp;
          if (from === null) {
            return;
          }
          nextStallTimestamp = null;
          let lo = 0;
          let hi = events.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (events[mid].timestamp < from) {
              lo = mid + 1;
            } else {
              hi = mid;
            }
          }
          scheduleEvents(ctx, events, lo);
        },
        pause(ctx) {
          ctx.timer.clear();
        },
        resetLastPlayedEvent: assign((ctx) => {
          return {
            ...ctx,
            lastPlayedEvent: null,
          };
        }),
        startLive: assign({
          baselineTime: (ctx, event) => {
            ctx.timer.start();
            if (event.type === 'TO_LIVE' && event.payload.baselineTime) {
              return event.payload.baselineTime;
            }
            return Date.now();
          },
        }),
      },
    },
  );
  return interpret(playerMachine);
}

export type SpeedContext = {
  normalSpeed: playerConfig['speed'];
  timer: Timer;
};

export type SpeedEvent =
  | {
      type: 'FAST_FORWARD';
      payload: { speed: playerConfig['speed'] };
    }
  | {
      type: 'BACK_TO_NORMAL';
    }
  | {
      type: 'SET_SPEED';
      payload: { speed: playerConfig['speed'] };
    };

export type SpeedState =
  | {
      value: 'normal';
      context: SpeedContext;
    }
  | {
      value: 'skipping';
      context: SpeedContext;
    };

export function createSpeedService(context: SpeedContext) {
  const speedMachine = createMachine<SpeedContext, SpeedEvent, SpeedState>(
    {
      id: 'speed',
      context,
      initial: 'normal',
      states: {
        normal: {
          on: {
            FAST_FORWARD: {
              target: 'skipping',
              actions: ['recordSpeed', 'setSpeed'],
            },
            SET_SPEED: {
              target: 'normal',
              actions: ['setSpeed'],
            },
          },
        },
        skipping: {
          on: {
            BACK_TO_NORMAL: {
              target: 'normal',
              actions: ['restoreSpeed'],
            },
            SET_SPEED: {
              target: 'normal',
              actions: ['setSpeed'],
            },
          },
        },
      },
    },
    {
      actions: {
        setSpeed: (ctx, event) => {
          if ('payload' in event) {
            ctx.timer.setSpeed(event.payload.speed);
          }
        },
        recordSpeed: assign({
          normalSpeed: (ctx) => ctx.timer.speed,
        }),
        restoreSpeed: (ctx) => {
          ctx.timer.setSpeed(ctx.normalSpeed);
        },
      },
    },
  );

  return interpret(speedMachine);
}

export type PlayerMachineState = StateMachine.State<
  PlayerContext,
  PlayerEvent,
  PlayerState
>;

export type SpeedMachineState = StateMachine.State<
  SpeedContext,
  SpeedEvent,
  SpeedState
>;
