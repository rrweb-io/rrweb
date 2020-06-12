import { playerConfig, actionWithDelay, eventWithTime } from '../types';
export declare class Timer {
    timeOffset: number;
    private actions;
    private config;
    private raf;
    constructor(config: playerConfig, actions?: actionWithDelay[]);
    addAction(action: actionWithDelay): void;
    addActions(actions: actionWithDelay[]): void;
    start(): void;
    clear(): void;
    private findActionIndex;
}
export declare function getDelay(event: eventWithTime, baselineTime: number): number;
