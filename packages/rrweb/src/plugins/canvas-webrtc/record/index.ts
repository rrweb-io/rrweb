import type { Mirror } from 'rrweb-snapshot';
import SimplePeer from 'simple-peer-light';
import type { RecordPlugin } from '../../../types';
import type { WebRTCDataChannel } from '../types';

export const PLUGIN_NAME = 'rrweb/canvas-webrtc@1';

export class RRWebPluginCanvasWebRTCRecord {
  private peer: SimplePeer.Instance | null = null;
  private mirror: Mirror;
  private streamMap: Map<number, MediaStream> = new Map();
  private signalSendCallback: (msg: RTCSessionDescriptionInit) => void;

  constructor({
    signalSendCallback,
    peer,
  }: {
    signalSendCallback: RRWebPluginCanvasWebRTCRecord['signalSendCallback'];
    peer?: SimplePeer.Instance;
  }) {
    this.signalSendCallback = signalSendCallback;
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

  public signalReceive(signal: RTCSessionDescriptionInit) {
    if (!this.peer) this.setupPeer();
    this.peer?.signal(signal);
  }

  private startStream(id: number, stream: MediaStream) {
    if (!this.peer) return this.setupPeer();

    const data: WebRTCDataChannel = {
      nodeId: id,
      streamId: stream.id,
    };
    this.peer?.send(JSON.stringify(data));
    this.peer?.addStream(stream);
  }

  public setupPeer() {
    if (!this.peer) {
      this.peer = new SimplePeer({
        initiator: true,
        // trickle: false, // only create one WebRTC offer per session
      });

      this.peer.on('error', (err: Error) => {
        this.peer = null;
        console.log('error', err);
      });

      this.peer.on('close', () => {
        this.peer = null;
        console.log('closing');
      });

      this.peer.on('signal', (data: RTCSessionDescriptionInit) => {
        this.signalSendCallback(data);
      });

      this.peer.on('connect', () => {
        for (const [id, stream] of this.streamMap) {
          this.startStream(id, stream);
        }
      });
    }
  }

  public setupStream(id: number): false | MediaStream {
    if (id === -1) return false;
    let stream: MediaStream | undefined = this.streamMap.get(id);
    if (stream) return stream;

    const el = this.mirror.getNode(id) as HTMLCanvasElement | null;
    // TODO: no node found, might be in a child iframe
    if (!el || !('captureStream' in el)) return false;

    stream = el.captureStream();
    this.streamMap.set(id, stream);
    this.setupPeer();

    return stream;
  }
}
