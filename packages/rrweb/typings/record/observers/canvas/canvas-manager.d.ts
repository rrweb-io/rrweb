import type { Mirror } from 'rrweb-snapshot';
import type { blockClass, canvasMutationCallback, IWindow } from '../../../types';
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
        recordCanvas: boolean;
        mutationCb: canvasMutationCallback;
        win: IWindow;
        blockClass: blockClass;
        mirror: Mirror;
        sampling?: 'all' | 'webrtc' | number;
    });
    private processMutation;
    private initCanvasFPSObserver;
    private setupPeer;
    private initCanvasWebRTCObserver;
    private initCanvasMutationObserver;
    private startPendingCanvasMutationFlusher;
    private startRAFTimestamping;
    flushPendingCanvasMutations(): void;
    flushPendingCanvasMutationFor(canvas: HTMLCanvasElement, id: number): void;
}
