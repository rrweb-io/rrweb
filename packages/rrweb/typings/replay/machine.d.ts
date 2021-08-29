import { StateMachine } from '@xstate/fsm';
import { playerConfig, eventWithTime, Emitter } from '../types';
import { Timer } from './timer';
export declare type PlayerContext = {
    events: eventWithTime[];
    timer: Timer;
    timeOffset: number;
    baselineTime: number;
    lastPlayedEvent: eventWithTime | null;
};
export declare type PlayerEvent = {
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
export declare type PlayerState = {
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
declare type PlayerAssets = {
    emitter: Emitter;
    applyEventsSynchronously(events: Array<eventWithTime>): void;
    getCastFn(event: eventWithTime, isSync: boolean): () => void;
};
export declare function createPlayerService(context: PlayerContext, { getCastFn, applyEventsSynchronously, emitter }: PlayerAssets): StateMachine.Service<PlayerContext, PlayerEvent, PlayerState>;
export declare type SpeedContext = {
    normalSpeed: playerConfig['speed'];
    timer: Timer;
};
export declare type SpeedEvent = {
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
export declare type SpeedState = {
    value: 'normal';
    context: SpeedContext;
} | {
    value: 'skipping';
    context: SpeedContext;
};
export declare function createSpeedService(context: SpeedContext): StateMachine.Service<SpeedContext, SpeedEvent, SpeedState>;
export declare type PlayerMachineState = StateMachine.State<PlayerContext, PlayerEvent, PlayerState>;
export declare type SpeedMachineState = StateMachine.State<SpeedContext, SpeedEvent, SpeedState>;
export {};
