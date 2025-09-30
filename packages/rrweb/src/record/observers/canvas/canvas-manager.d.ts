import type { Mirror } from '@newrelic/rrweb-snapshot';
import type { blockClass, canvasMutationCallback, IWindow, DataURLOptions } from '@newrelic/rrweb-types';
export type RafStamps = {
    latestId: number;
    invokeId: number | null;
};
export declare class CanvasManager {
    private pendingCanvasMutations;
    private rafStamps;
    private mirror;
    private mutationCb;
    private resetObservers?;
    private frozen;
    private locked;
    reset(): void;
    freeze(): void;
    unfreeze(): void;
    lock(): void;
    unlock(): void;
    constructor(options: {
        recordCanvas: boolean;
        mutationCb: canvasMutationCallback;
        win: IWindow;
        blockClass: blockClass;
        blockSelector: string | null;
        mirror: Mirror;
        sampling?: 'all' | number;
        dataURLOptions: DataURLOptions;
    });
    private processMutation;
    private initCanvasFPSObserver;
    private initCanvasMutationObserver;
    private startPendingCanvasMutationFlusher;
    private startRAFTimestamping;
    flushPendingCanvasMutations(): void;
    flushPendingCanvasMutationFor(canvas: HTMLCanvasElement, id: number): void;
}
