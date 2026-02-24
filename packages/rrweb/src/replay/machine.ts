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
} from '@amplitude/rrweb-types';
import { Timer, addDelay } from './timer';
import {
  type SnapshotCheckpoint,
  findNearestCheckpoint,
} from './checkpoint-index';

/**
 * Check whether an existing event in the array is a duplicate of the
 * incoming event. Uses a two-tier strategy:
 *
 * 1. Reference equality — same object instance, cheapest check.
 * 2. If timestamp and type match, fall back to JSON.stringify to catch
 *    structurally identical events with different references. This is
 *    rare in practice — two events seldom share the exact same
 *    millisecond timestamp AND event type.
 */
function isDuplicateEvent(
  existing: eventWithTime,
  incoming: eventWithTime,
): boolean {
  // Tier 1: same object reference
  if (existing === incoming) {
    return true;
  }

  // Tier 2: same timestamp + type → expensive structural comparison
  if (
    existing.timestamp === incoming.timestamp &&
    existing.type === incoming.type
  ) {
    return JSON.stringify(existing) === JSON.stringify(incoming);
  }

  return false;
}

export type PlayerContext = {
  events: eventWithTime[];
  timer: Timer;
  timeOffset: number;
  baselineTime: number;
  lastPlayedEvent: eventWithTime | null;
  checkpointIndex: SnapshotCheckpoint[];
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
      type: 'ADD_EVENT';
      payload: {
        event: eventWithTime;
      };
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
      value: 'live';
      context: PlayerContext;
    };

type PlayerAssets = {
  emitter: Emitter;
  applyEventsSynchronously(events: Array<eventWithTime>): void;
  getCastFn(event: eventWithTime, isSync: boolean): () => void;
};
export function createPlayerService(
  context: PlayerContext,
  { getCastFn, applyEventsSynchronously, emitter }: PlayerAssets,
) {
  const playerMachine = createMachine<PlayerContext, PlayerEvent, PlayerState>(
    {
      id: 'player',
      context,
      initial: 'paused',
      states: {
        playing: {
          on: {
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
            ADD_EVENT: {
              target: 'playing',
              actions: ['addEvent'],
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
            TO_LIVE: {
              target: 'live',
              actions: ['startLive'],
            },
            ADD_EVENT: {
              target: 'paused',
              actions: ['addEvent'],
            },
          },
        },
        live: {
          on: {
            ADD_EVENT: {
              target: 'live',
              actions: ['addEvent'],
            },
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
          const {
            timer,
            events,
            baselineTime,
            lastPlayedEvent,
            checkpointIndex,
          } = ctx;
          timer.clear();

          // Find the nearest snapshot checkpoint at or before baselineTime using
          // binary search O(log C) instead of the previous O(N) backward scan
          // through all events. This determines where we start replaying from,
          // since events before the last Meta+FullSnapshot pair are not needed because
          // the FullSnapshot rebuilds the entire DOM from scratch.
          const checkpoint = findNearestCheckpoint(
            checkpointIndex,
            baselineTime,
          );
          const startIndex = checkpoint ? checkpoint.metaEventIndex : 0;

          // Only compute delays for events from the checkpoint onward
          for (let i = startIndex; i < events.length; i++) {
            addDelay(events[i], baselineTime);
          }

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

          // baselineTime is the timestamp the player is seeking to (i.e. the
          // point in the recording where real-time playback begins).
          //
          // Events before baselineTime are "sync". They are applied instantly
          // in a single batch via applyEventsSynchronously() to rebuild the DOM
          // state up to that point. Events at or after baselineTime are "async".
          // They are scheduled on the timer to play back in real time.
          const syncEvents = new Array<eventWithTime>();
          for (let i = startIndex; i < events.length; i++) {
            const event = events[i];
            if (
              lastPlayedTimestamp &&
              lastPlayedTimestamp < baselineTime &&
              (event.timestamp <= lastPlayedTimestamp ||
                event === lastPlayedEvent)
            ) {
              continue;
            }
            if (event.timestamp < baselineTime) {
              syncEvents.push(event);
            } else {
              const castFn = getCastFn(event, false);
              timer.addAction({
                doAction: () => {
                  castFn();
                },
                delay: event.delay ?? 0,
              });
            }
          }

          applyEventsSynchronously(syncEvents);
          emitter.emit(ReplayerEvents.Flush);
          timer.start();
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
        addEvent: assign((ctx, machineEvent) => {
          const { baselineTime, timer, events, checkpointIndex } = ctx;
          if (machineEvent.type === 'ADD_EVENT') {
            const { event } = machineEvent.payload;
            addDelay(event, baselineTime);

            let end = events.length - 1;
            let insertionIndex: number;
            if (!events[end] || events[end].timestamp <= event.timestamp) {
              // Fast track: append at end.
              // Deduplicate against the last event before appending.
              if (events[end] && isDuplicateEvent(events[end], event)) {
                return { ...ctx, events };
              }
              events.push(event);
              insertionIndex = events.length - 1;
            } else {
              let start = 0;
              insertionIndex = 0;
              while (start <= end) {
                const mid = Math.floor((start + end) / 2);
                if (events[mid].timestamp <= event.timestamp) {
                  start = mid + 1;
                } else {
                  end = mid - 1;
                }
              }
              insertionIndex = start;
              events.splice(insertionIndex, 0, event);
            }

            // Checkpoint index maintenance
            //
            // Inserting an event in the middle of the array shifts all
            // subsequent events to higher indices, so we must update
            // any checkpoint whose metaEventIndex is at or after the insertion
            // point.

            // NOTE: If the new event is a Meta event, it represents a new
            // snapshot boundary that the player can seek to, so it also gets
            // its own checkpoint entry.
            if (event.type === EventType.Meta) {
              const newCheckpoint: SnapshotCheckpoint = {
                metaEventIndex: insertionIndex,
                timestamp: event.timestamp,
              };

              // Fast path: new Meta event is the latest meaning just append.
              // This is the common case during live streaming.
              const lastCheckpoint =
                checkpointIndex[checkpointIndex.length - 1];
              if (
                !lastCheckpoint ||
                lastCheckpoint.timestamp <= event.timestamp
              ) {
                checkpointIndex.push(newCheckpoint);
              } else {
                // Rare out-of-order insertion: increment existing checkpoint
                // indices at or after the insertion point, then binary-search
                // for the correct position to insert the new checkpoint.
                for (const checkpoint of checkpointIndex) {
                  if (checkpoint.metaEventIndex >= insertionIndex) {
                    checkpoint.metaEventIndex++;
                  }
                }
                // Binary search for the sorted insertion position
                let searchLo = 0;
                let searchHi = checkpointIndex.length - 1;
                while (searchLo <= searchHi) {
                  const mid = Math.floor((searchLo + searchHi) / 2);
                  if (checkpointIndex[mid].timestamp <= event.timestamp) {
                    searchLo = mid + 1;
                  } else {
                    searchHi = mid - 1;
                  }
                }

                // NOTE: splice() shifts array elements, but checkpointIndex only
                // contains Meta events (a handful per session), so this is far
                // cheaper than splicing into the full events array.
                checkpointIndex.splice(searchLo, 0, newCheckpoint);
              }
            }

            // Non-Meta event inserted in the middle of the array
            else if (
              insertionIndex <
              events.length - 1 // not appended at end
            ) {
              // Increment checkpoint indices at or after the insertion point so
              // they continue pointing at the correct Meta events.
              for (const checkpoint of checkpointIndex) {
                if (checkpoint.metaEventIndex >= insertionIndex) {
                  checkpoint.metaEventIndex++;
                }
              }
            }

            const isSync = event.timestamp < baselineTime;
            const castFn = getCastFn(event, isSync);
            if (isSync) {
              castFn();
            } else if (timer.isActive()) {
              timer.addAction({
                doAction: () => {
                  castFn();
                },
                delay: event.delay ?? 0,
              });
            }
          }
          return { ...ctx, events, checkpointIndex };
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
