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

export function findEventIndex(
  events: eventWithTime[],
  timestamp: number,
): number {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].timestamp < timestamp) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

type PlayerAssets = {
  emitter: Emitter;
  applyEventsSynchronously(
    events: Array<eventWithTime>,
    baselineTime: number,
  ): void;
  getCastFn(event: eventWithTime, isSync: boolean): () => void;
  isStallMarker(event: eventWithTime): boolean;
};
export function createPlayerService(
  context: PlayerContext,
  { getCastFn, applyEventsSynchronously, emitter, isStallMarker }: PlayerAssets,
) {
  const scheduleEvents = (ctx: PlayerContext, events: eventWithTime[]) => {
    const { timer, baselineTime } = ctx;
    for (const event of events) {
      addDelay(event, baselineTime);
      if (isStallMarker(event)) {
        timer.addAction({
          doAction: () => stallMarkerReached(event),
          delay: event.delay!,
        });
        return; // don't schedule events after a stall marker
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

  const stallMarkerReached = (marker: eventWithTime) => {
    const ctx = service.state.context;
    const markerIndex = ctx.events.indexOf(marker);
    if (
      !isStallMarker(marker) || // controller no longer considers event a stall
      markerIndex === -1 // or has removed the event directly
    ) {
      const scheduleFrom =
        markerIndex !== -1
          ? markerIndex
          : findEventIndex(ctx.events, marker.timestamp);
      scheduleEvents(ctx, ctx.events.slice(scheduleFrom));
    } else {
      // marker hasn't been cleared, so enter stall
      service.send({ type: 'STALL' });
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
            END: {
              target: 'paused',
              actions: ['resetLastPlayedEvent', 'pause'],
            },
            STALL: {
              target: 'stalled',
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
          // We do not have the ability to undo events i.e. apply backwards.
          // To play at a given target timeOffset (baselineTime) we
          // gather all events from most recent prior fullFullSnapshot forwards,
          // casting event before baselineTime synchronously, and scheduling
          // casting of upcoming events asynchronously with timer
          const { timer, events, baselineTime, lastPlayedEvent } = ctx;
          timer.clear();

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
          let scheduleStart = neededEvents.length;
          for (let i = 0; i < neededEvents.length; i++) {
            const event = neededEvents[i];
            if (
              lastPlayedTimestamp &&
              lastPlayedTimestamp < baselineTime &&
              (event.timestamp <= lastPlayedTimestamp ||
                event === lastPlayedEvent)
            ) {
              // don't reapply already played
              continue;
            }
            if (isStallMarker(event)) {
              // a stall marker prior to requested playhead. break so we
              // don't apply any syncEvents between stall marker and playhead
              scheduleStart = i;
              break;
            }
            if (event.timestamp < baselineTime) {
              syncEvents.push(event);
            } else {
              scheduleStart = i;
              break;
            }
          }
          applyEventsSynchronously(syncEvents, baselineTime);
          scheduleEvents(ctx, neededEvents.slice(scheduleStart));
          emitter.emit(ReplayerEvents.Flush);
          timer.start();
          return;
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
  const service = interpret(playerMachine);
  return service;
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
