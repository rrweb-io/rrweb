import SimplePeer from 'simple-peer-light';
import type { RecordPlugin } from '../../../types';
export declare const PLUGIN_NAME = "rrweb/canvas-webrtc@1";
export declare class RRWebPluginCanvasWebRTCRecord {
    private sdpOffer;
    private peer;
    private mirror;
    private streamMap;
    private webRTCCallback;
    constructor({ webRTCCallback, peer, }: {
        webRTCCallback: RRWebPluginCanvasWebRTCRecord['webRTCCallback'];
        peer?: SimplePeer.Instance;
    });
    initPlugin(): RecordPlugin;
    webRTCSignalCallback(signal: RTCSessionDescriptionInit): void;
    private startStream;
    private peerConnected;
    private idSentSet;
    setupPeer(id: number, stream: MediaStream, streamMap: Map<number, MediaStream>): void;
    setupStream(id: number): false | MediaStream;
}
