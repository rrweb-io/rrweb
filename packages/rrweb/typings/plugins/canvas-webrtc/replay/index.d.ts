import type { ReplayPlugin } from '../../../types';
export declare class RRWebPluginCanvasWebRTCReplay {
    private canvasFoundCallback;
    private webRTCSignalCallback;
    private mirror;
    constructor(canvasFoundCallback: RRWebPluginCanvasWebRTCReplay['canvasFoundCallback'], webRTCSignalCallback: RRWebPluginCanvasWebRTCReplay['webRTCSignalCallback']);
    initPlugin(): ReplayPlugin;
    private startStream;
    private peer;
    private streamId;
    setupWebRTC(msg: RTCSessionDescriptionInit): void;
    webRTCSignal(signal: RTCSessionDescriptionInit): void;
}
