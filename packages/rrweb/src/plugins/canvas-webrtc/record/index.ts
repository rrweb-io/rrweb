import type { Mirror } from 'rrweb-snapshot';
import SimplePeer from 'simple-peer-light';
import type { RecordPlugin } from '../../../types';
import type { WebRTCDataChannel } from '../types';

export const PLUGIN_NAME = 'rrweb/canvas-webrtc@1';

export class RRWebPluginCanvasWebRTCRecord {
  private sdpOffer: RTCSessionDescriptionInit;
  private peer: SimplePeer.Instance;
  private mirror: Mirror;
  private streamMap: Map<number, MediaStream> = new Map();
  private webRTCCallback: (msg: RTCSessionDescriptionInit) => void;

  constructor({
    webRTCCallback,
    peer,
  }: {
    webRTCCallback: RRWebPluginCanvasWebRTCRecord['webRTCCallback'];
    peer?: SimplePeer.Instance;
  }) {
    this.webRTCCallback = webRTCCallback;
    if (peer) this.peer = peer;
  }

  public initPlugin(): RecordPlugin {
    return {
      name: PLUGIN_NAME,
      getMirror: (mirror) => {
        this.mirror = mirror;
      },
      options: {},
    };
  }

  public webRTCSignalCallback(signal: RTCSessionDescriptionInit) {
    this.peer.signal(signal);
  }

  private startStream(id: number, stream: MediaStream) {
    const data: WebRTCDataChannel = {
      id,
    };
    this.peer.send(JSON.stringify(data));
    this.peer.addStream(stream);
    this.peer.send(JSON.stringify(data));
  }

  private peerConnected = false;
  private idSentSet: Set<number> = new Set();
  public setupPeer(
    id: number,
    stream: MediaStream,
    streamMap: Map<number, MediaStream>,
  ) {
    if (!this.peer) {
      this.peer = new SimplePeer({
        initiator: true,
        // trickle: false, // only create one WebRTC offer per session
      });

      this.peer.on('error', (err) => {
        console.error('record peer error', err);
      });

      this.peer.on('signal', (data: RTCSessionDescriptionInit) => {
        console.log('record signal', data);
        this.sdpOffer = data;
        this.webRTCCallback(data);
        this.idSentSet.add(id);
      });

      this.peer.on('connect', () => {
        this.peerConnected = true;
        for (const [id, stream] of streamMap) {
          this.startStream(id, stream);
          if (!this.idSentSet.has(id)) {
            this.idSentSet.add(id);
          }
        }
      });
    } else if (this.sdpOffer && this.peerConnected) {
      this.startStream(id, stream);
    }
  }

  public setupStream(id: number): false | MediaStream {
    if (id === -1) return false;
    let stream: MediaStream | undefined = this.streamMap.get(id);
    if (stream) return stream;

    const el = this.mirror.getNode(id) as HTMLCanvasElement | null;
    if (!el || !('captureStream' in el)) return false;

    stream = el.captureStream();
    this.streamMap.set(id, stream);
    this.setupPeer(id, stream, this.streamMap);

    return stream;
  }

  // private initCanvasWebRTCObserver(win: IWindow, blockClass: blockClass) {
  //   const canvasContextReset = initCanvasContextObserver(win, blockClass);
  //   const streamMap: Map<number, MediaStream> = new Map();
  //   let rafId: number;

  //   const captureStreams = () => {
  //     win.document
  //       .querySelectorAll(`canvas:not(.${blockClass as string} *)`)
  //       .forEach((canvas: HTMLCanvasElement) => {
  //         const id = this.mirror.getId(canvas);
  //         if (id === -1 || streamMap.has(id)) return;
  //         const stream = canvas.captureStream();
  //         streamMap.set(id, stream);
  //         this.setupPeer(id, stream, streamMap);
  //       });
  //     rafId = requestAnimationFrame(captureStreams);
  //   };

  //   rafId = requestAnimationFrame(captureStreams);

  //   this.resetObservers = () => {
  //     canvasContextReset();
  //     cancelAnimationFrame(rafId);
  //   };
  // }
}
