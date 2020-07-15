import { playerConfig, eventWithTime, Emitter } from '../types';
import { Timer } from './timer';
export declare type PlayerContext = {
    events: eventWithTime[];
    timer: Timer;
    speed: playerConfig['speed'];
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
    type: 'RESUME';
    payload: {
        timeOffset: number;
    };
} | {
    type: 'END';
} | {
    type: 'REPLAY';
} | {
    type: 'FAST_FORWARD';
} | {
    type: 'BACK_TO_NORMAL';
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
};
export declare type PlayerState = {
    value: 'inited';
    context: PlayerContext;
} | {
    value: 'playing';
    context: PlayerContext;
} | {
    value: 'paused';
    context: PlayerContext;
} | {
    value: 'ended';
    context: PlayerContext;
} | {
    value: 'skipping';
    context: PlayerContext;
} | {
    value: 'live';
    context: PlayerContext;
};
export declare function discardPriorSnapshots(events: eventWithTime[], baselineTime: number): eventWithTime[];
declare type PlayerAssets = {
    emitter: Emitter;
    getCastFn(event: eventWithTime, isSync: boolean): () => void;
};
export declare function createPlayerService(context: PlayerContext, { getCastFn, emitter }: PlayerAssets): import("@xstate/fsm").StateMachine.Service<PlayerContext, PlayerEvent, PlayerState>;
export {};
