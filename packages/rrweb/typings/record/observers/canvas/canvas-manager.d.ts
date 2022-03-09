import { blockClass, canvasMutationCallback, IWindow, Mirror } from '../../../types';
export declare type RafStamps = {
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
        recordCanvas: boolean | number;
        mutationCb: canvasMutationCallback;
        win: IWindow;
        blockClass: blockClass;
        mirror: Mirror;
    });
    private processMutation;
    private initCanvasMutationObserver;
    private startPendingCanvasMutationFlusher;
    private startRAFTimestamping;
    flushPendingCanvasMutations(): void;
    flushPendingCanvasMutationFor(canvas: HTMLCanvasElement, id: number): void;
}
