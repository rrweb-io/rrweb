import { actionWithDelay, eventWithTime } from '../types';
export declare class Timer {
    timeOffset: number;
    speed: number;
    private actions;
    private raf;
    private liveMode;
    constructor(actions: actionWithDelay[] | undefined, speed: number);
    addAction(action: actionWithDelay): void;
    addActions(actions: actionWithDelay[]): void;
    start(): void;
    clear(): void;
    setSpeed(speed: number): void;
    toggleLiveMode(mode: boolean): void;
    isActive(): boolean;
    private findActionIndex;
}
export declare function addDelay(event: eventWithTime, baselineTime: number): number;
