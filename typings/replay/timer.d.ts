import { playerConfig, actionWithDelay } from '../types';
export default class Timer {
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
