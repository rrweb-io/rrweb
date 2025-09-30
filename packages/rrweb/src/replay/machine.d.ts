import { type StateMachine } from '@xstate/fsm';
import type { playerConfig } from '../types';
import { type eventWithTime, type Emitter } from '@newrelic/rrweb-types';
import { Timer } from './timer';
export type PlayerContext = {
    events: eventWithTime[];
    timer: Timer;
    timeOffset: number;
    baselineTime: number;
    lastPlayedEvent: eventWithTime | null;
};
export type PlayerEvent = {
    type: 'PLAY';
    payload: {
        timeOffset: number;
    };
} | {
    type: 'CAST_EVENT';
    payload: {
        event: eventWithTime;
    };
} | {
    type: 'PAUSE';
} | {
    type: 'TO_LIVE';
    payload: {
        baselineTime?: number;
    };
} | {
    type: 'ADD_EVENT';
    payload: {
        event: eventWithTime;
    };
} | {
    type: 'END';
};
export type PlayerState = {
    value: 'playing';
    context: PlayerContext;
} | {
    value: 'paused';
    context: PlayerContext;
} | {
    value: 'live';
    context: PlayerContext;
};
export declare function discardPriorSnapshots(events: eventWithTime[], baselineTime: number): eventWithTime[];
type PlayerAssets = {
    emitter: Emitter;
    applyEventsSynchronously(events: Array<eventWithTime>): void;
    getCastFn(event: eventWithTime, isSync: boolean): () => void;
};
export declare function createPlayerService(context: PlayerContext, { getCastFn, applyEventsSynchronously, emitter }: PlayerAssets): StateMachine.Service<PlayerContext, PlayerEvent, PlayerState>;
export type SpeedContext = {
    normalSpeed: playerConfig['speed'];
    timer: Timer;
};
export type SpeedEvent = {
    type: 'FAST_FORWARD';
    payload: {
        speed: playerConfig['speed'];
    };
} | {
    type: 'BACK_TO_NORMAL';
} | {
    type: 'SET_SPEED';
    payload: {
        speed: playerConfig['speed'];
    };
};
export type SpeedState = {
    value: 'normal';
    context: SpeedContext;
} | {
    value: 'skipping';
    context: SpeedContext;
};
export declare function createSpeedService(context: SpeedContext): StateMachine.Service<SpeedContext, SpeedEvent, SpeedState>;
export type PlayerMachineState = StateMachine.State<PlayerContext, PlayerEvent, PlayerState>;
export type SpeedMachineState = StateMachine.State<SpeedContext, SpeedEvent, SpeedState>;
export {};
