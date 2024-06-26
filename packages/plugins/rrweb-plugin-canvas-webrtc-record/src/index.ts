import type { Mirror } from '@saola.ai/rrweb-snapshot';
import SimplePeer from 'simple-peer-light';
import type {
  RecordPlugin,
  ICrossOriginIframeMirror,
} from '@saola.ai/rrweb-types';
import type { WebRTCDataChannel } from './types';

export const PLUGIN_NAME = 'rrweb/canvas-webrtc@1';

export type CrossOriginIframeMessageEventContent = {
  type: 'rrweb-canvas-webrtc';
  data:
    | {
        type: 'signal';
        signal: RTCSessionDescriptionInit;
      }
    | {
        type: 'who-has-canvas';
        rootId: number;
        id: number;
      }
    | {
        type: 'i-have-canvas';
        rootId: number;
      };
};

export class RRWebPluginCanvasWebRTCRecord {
  private peer: SimplePeer.Instance | null = null;
  private mirror: Mirror | undefined;
  private crossOriginIframeMirror: ICrossOriginIframeMirror | undefined;
  private streamMap: Map<number, MediaStream> = new Map();
  private incomingStreams = new Set<MediaStream>();
  private outgoingStreams = new Set<MediaStream>();
  private streamNodeMap = new Map<string, number>();
  private canvasWindowMap = new Map<number, WindowProxy>();
  private windowPeerMap = new WeakMap<WindowProxy, SimplePeer.Instance>();
  private peerWindowMap = new WeakMap<SimplePeer.Instance, WindowProxy>();
  private signalSendCallback: (msg: RTCSessionDescriptionInit) => void;

  constructor({
    signalSendCallback,
    peer,
  }: {
    signalSendCallback: RRWebPluginCanvasWebRTCRecord['signalSendCallback'];
    peer?: SimplePeer.Instance;
  }) {
    this.signalSendCallback = signalSendCallback;
    window.addEventListener('message', (event: MessageEvent) =>
      this.windowPostMessageHandler(event),
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
    if (!this.peer) this.setupPeer();
    this.peer?.signal(signal);
  }

  public signalReceiveFromCrossOriginIframe(
    signal: RTCSessionDescriptionInit,
    source: WindowProxy,
  ) {
    const peer = this.setupPeer(source);
    peer.signal(signal);
  }

  private startStream(id: number, stream: MediaStream) {
    if (!this.peer) this.setupPeer();

    const data: WebRTCDataChannel = {
      nodeId: id,
      streamId: stream.id,
    };
    this.peer?.send(JSON.stringify(data));
    if (!this.outgoingStreams.has(stream)) this.peer?.addStream(stream);
    this.outgoingStreams.add(stream);
  }

  public setupPeer(source?: WindowProxy): SimplePeer.Instance {
    let peer: SimplePeer.Instance;

    if (!source) {
      if (this.peer) return this.peer;

      peer = this.peer = new SimplePeer({
        initiator: true,
        // trickle: false, // only create one WebRTC offer per session
      });
    } else {
      const peerFromMap = this.windowPeerMap.get(source);

      if (peerFromMap) return peerFromMap;

      peer = new SimplePeer({
        initiator: false,
        // trickle: false, // only create one WebRTC offer per session
      });
      this.windowPeerMap.set(source, peer);
      this.peerWindowMap.set(peer, source);
    }

    const resetPeer = (source?: WindowProxy) => {
      if (!source) return (this.peer = null);

      this.windowPeerMap.delete(source);
      this.peerWindowMap.delete(peer);
    };

    peer.on('error', (err: Error) => {
      resetPeer(source);
      console.log('error', err);
    });

    peer.on('close', () => {
      resetPeer(source);
      console.log('closing');
    });

    peer.on('signal', (data: RTCSessionDescriptionInit) => {
      if (this.inRootFrame()) {
        if (peer === this.peer) {
          // connected to replayer
          this.signalSendCallback(data);
        } else {
          // connected to cross-origin iframe
          this.peerWindowMap.get(peer)?.postMessage(
            {
              type: 'rrweb-canvas-webrtc',
              data: {
                type: 'signal',
                signal: data,
              },
            } as CrossOriginIframeMessageEventContent,
            '*',
          );
        }
      } else {
        // connected to root frame
        window.top?.postMessage(
          {
            type: 'rrweb-canvas-webrtc',
            data: {
              type: 'signal',
              signal: data,
            },
          } as CrossOriginIframeMessageEventContent,
          '*',
        );
      }
    });

    peer.on('connect', () => {
      // connected to cross-origin iframe, no need to do anything
      if (this.inRootFrame() && peer !== this.peer) return;

      // cross origin frame connected to root frame
      // or root frame connected to replayer
      // send all streams to peer
      for (const [id, stream] of this.streamMap) {
        this.startStream(id, stream);
      }
    });

    if (!this.inRootFrame()) return peer;

    peer.on('data', (data: SimplePeer.SimplePeerData) => {
      try {
        const json = JSON.parse(data as string) as WebRTCDataChannel;
        this.streamNodeMap.set(json.streamId, json.nodeId);
      } catch (error) {
        console.error('Could not parse data', error);
      }
      this.flushStreams();
    });

    peer.on('stream', (stream: MediaStream) => {
      this.incomingStreams.add(stream);
      this.flushStreams();
    });

    return peer;
  }

  public setupStream(id: number, rootId?: number): boolean | MediaStream {
    if (id === -1 || !this.mirror) return false;
    let stream: MediaStream | undefined = this.streamMap.get(rootId || id);
    if (stream) return stream;

    const el = this.mirror.getNode(id) as HTMLCanvasElement | null;

    if (!el || !('captureStream' in el))
      // we don't have it, lets check our iframes
      return this.setupStreamInCrossOriginIframe(id, rootId || id);

    if (!this.inRootFrame()) {
      window.top?.postMessage(
        {
          type: 'rrweb-canvas-webrtc',
          data: {
            type: 'i-have-canvas',
            rootId: rootId || id,
          },
        } as CrossOriginIframeMessageEventContent,
        '*',
      );
    }

    stream = el.captureStream();
    this.streamMap.set(rootId || id, stream);
    this.setupPeer();

    return stream;
  }

  private flushStreams() {
    this.incomingStreams.forEach((stream) => {
      const nodeId = this.streamNodeMap.get(stream.id);
      if (!nodeId) return;
      // got remote video stream, now let's send it to the replayer
      this.startStream(nodeId, stream);
    });
  }

  private inRootFrame(): boolean {
    return Boolean(window.top && window.top === window);
  }

  public setupStreamInCrossOriginIframe(id: number, rootId: number): boolean {
    let found = false;

    document.querySelectorAll('iframe').forEach((iframe) => {
      if (found) return;
      if (!this.crossOriginIframeMirror) return;

      const remoteId = this.crossOriginIframeMirror.getRemoteId(iframe, id);
      if (remoteId === -1) return;

      found = true;
      iframe.contentWindow?.postMessage(
        {
          type: 'rrweb-canvas-webrtc',
          data: {
            type: 'who-has-canvas',
            id: remoteId,
            rootId,
          },
        } as CrossOriginIframeMessageEventContent,
        '*',
      );
    });
    return found;
  }

  private isCrossOriginIframeMessageEventContent(
    event: MessageEvent<unknown>,
  ): event is MessageEvent<CrossOriginIframeMessageEventContent> {
    return Boolean(
      event.data &&
        typeof event.data === 'object' &&
        'type' in event.data &&
        'data' in event.data &&
        (event.data as CrossOriginIframeMessageEventContent).type ===
          'rrweb-canvas-webrtc' &&
        (event.data as CrossOriginIframeMessageEventContent).data,
    );
  }

  /**
   * All messages being sent to the (root or sub) frame are received through `windowPostMessageHandler`.
   * @param event - The message event
   */
  private windowPostMessageHandler(
    event: MessageEvent<CrossOriginIframeMessageEventContent> | MessageEvent,
  ) {
    if (!this.isCrossOriginIframeMessageEventContent(event)) return;

    const { type } = event.data.data;
    if (type === 'who-has-canvas') {
      const { id, rootId } = event.data.data;
      this.setupStream(id, rootId);
    } else if (type === 'signal') {
      const { signal } = event.data.data;
      const { source } = event;
      if (!source || !('self' in source)) return;
      if (this.inRootFrame()) {
        this.signalReceiveFromCrossOriginIframe(signal, source);
      } else {
        this.signalReceive(signal);
      }
    } else if (type === 'i-have-canvas') {
      const { rootId } = event.data.data;
      const { source } = event;
      if (!source || !('self' in source)) return;
      this.canvasWindowMap.set(rootId, source);
    }
  }
}
