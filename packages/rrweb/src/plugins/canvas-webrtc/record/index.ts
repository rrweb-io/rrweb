import type { Mirror } from 'rrweb-snapshot';
import SimplePeer from 'simple-peer-light';
import type CrossOriginIframeMirror from '../../../record/cross-origin-iframe-mirror';
import type { RecordPlugin } from '../../../types';
import type { WebRTCDataChannel } from '../types';

export const PLUGIN_NAME = 'rrweb/canvas-webrtc@1';

export type CrossOriginIframeMessageEventContent = {
  type: 'rrweb-canvas-webrtc';
  data:
    | {
        type: 'setup-stream';
        id: number;
        rootId: number;
      }
    | {
        type: 'signal';
        signal: RTCSessionDescriptionInit;
      };
};

export class RRWebPluginCanvasWebRTCRecord {
  private peer: SimplePeer.Instance | null = null;
  private mirror: Mirror;
  private crossOriginIframeMirror: CrossOriginIframeMirror;
  private streamMap: Map<number, MediaStream> = new Map();
  private crossOriginStreamMap: Map<number, HTMLIFrameElement> = new Map();
  private signalSendCallback: (msg: RTCSessionDescriptionInit) => void;

  constructor({
    signalSendCallback,
    peer,
  }: {
    signalSendCallback: RRWebPluginCanvasWebRTCRecord['signalSendCallback'];
    peer?: SimplePeer.Instance;
  }) {
    this.signalSendCallback = signalSendCallback;
    window.addEventListener(
      'message',
      this.windowPostMessageHandler.bind(this),
    );
    if (peer) this.peer = peer;
  }

  public initPlugin(): RecordPlugin {
    return {
      name: PLUGIN_NAME,
      getMirror: ({ nodeMirror, crossOriginIframeMirror }) => {
        this.mirror = nodeMirror;
        this.crossOriginIframeMirror = crossOriginIframeMirror;
      },
      options: {},
    };
  }

  public signalReceive(signal: RTCSessionDescriptionInit) {
    if (this.streamMap.size) {
      if (!this.peer) this.setupPeer();
      this.peer?.signal(signal);
    }
    if (this.crossOriginStreamMap.size) {
      [...this.crossOriginStreamMap.entries()].forEach(([id, iframe]) => {
        if (this.crossOriginIframeMirror.getRemoteId(iframe, id) === -1) {
          this.crossOriginStreamMap.delete(id);
          return;
        }

        iframe.contentWindow?.postMessage(
          {
            type: 'rrweb-canvas-webrtc',
            data: {
              type: 'signal',
              signal: signal,
            },
          } as CrossOriginIframeMessageEventContent,
          '*',
        );
      });
    }
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

  public setupStream(
    id: number,
    rootId?: number,
  ): false | MediaStream | number {
    if (id === -1) return false;
    let stream: MediaStream | undefined = this.streamMap.get(rootId || id);
    if (stream) return stream;

    const el = this.mirror.getNode(id) as HTMLCanvasElement | null;

    if (!el || !('captureStream' in el))
      return this.setupStreamInCrossOriginIframe(id, rootId || id);

    stream = el.captureStream();
    this.streamMap.set(rootId || id, stream);
    this.setupPeer();

    return stream;
  }

  public setupStreamInCrossOriginIframe(
    id: number,
    rootId: number,
  ): false | MediaStream | number {
    let stream: MediaStream | undefined | false | number = this.streamMap.get(
      id,
    );
    // TODO: no need to loop through everything if we set a master id/iframe map
    document.querySelectorAll('iframe').forEach((iframe) => {
      const remoteId = this.crossOriginIframeMirror.getRemoteId(iframe, id);
      if (remoteId === -1) return;
      this.crossOriginStreamMap.set(id, iframe);
      iframe.contentWindow?.postMessage(
        {
          type: 'rrweb-canvas-webrtc',
          data: {
            type: 'setup-stream',
            id: remoteId,
            rootId,
          },
        } as CrossOriginIframeMessageEventContent,
        '*',
      );
      stream = remoteId;
    });

    return stream || false;
  }

  private isCrossOriginIframeMessageEventContent(
    event: MessageEvent,
  ): event is MessageEvent<CrossOriginIframeMessageEventContent> {
    return Boolean(
      'type' in event.data &&
        'data' in event.data &&
        (event.data as CrossOriginIframeMessageEventContent).type ===
          'rrweb-canvas-webrtc' &&
        (event.data as CrossOriginIframeMessageEventContent).data,
    );
  }

  private windowPostMessageHandler(event: MessageEvent) {
    if (!this.isCrossOriginIframeMessageEventContent(event)) return;

    const { type } = event.data.data;
    if (type === 'setup-stream') {
      const { id, rootId } = event.data.data;
      const stream = this.setupStream(id, rootId);
      if (stream === false) return;
    } else if (type === 'signal') {
      const { signal } = event.data.data;

      this.signalReceive(signal);
    } else {
      console.warn('MESSAGE', event.data);
    }
  }
}
