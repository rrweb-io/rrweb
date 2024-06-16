import type { RRNode } from '@saola.ai/rrdom';
import type { Mirror } from '@saola.ai/rrweb-snapshot';
import SimplePeer from 'simple-peer-light';
import type { ReplayPlugin, Replayer } from '@saola.ai/rrweb';
import type { WebRTCDataChannel } from './types';

// TODO: restrict callback to real nodes only, or make sure callback gets called when real node gets added to dom as well

export class RRWebPluginCanvasWebRTCReplay {
  private canvasFoundCallback: (
    node: Node | RRNode,
    context: { id: number; replayer: Replayer },
  ) => void;
  private signalSendCallback: (signal: RTCSessionDescriptionInit) => void;
  private mirror: Mirror | undefined;

  constructor({
    canvasFoundCallback,
    signalSendCallback,
  }: {
    canvasFoundCallback: RRWebPluginCanvasWebRTCReplay['canvasFoundCallback'];
    signalSendCallback: RRWebPluginCanvasWebRTCReplay['signalSendCallback'];
  }) {
    this.canvasFoundCallback = canvasFoundCallback;
    this.signalSendCallback = signalSendCallback;
  }

  public initPlugin(): ReplayPlugin {
    return {
      onBuild: (
        node: Node | RRNode,
        context: { id: number; replayer: Replayer },
      ) => {
        if (node.nodeName === 'CANVAS') {
          this.canvasFoundCallback(node, context);
        }
      },
      getMirror: (options) => {
        this.mirror = options.nodeMirror;
      },
    };
  }

  private startStream(
    target: HTMLCanvasElement | HTMLVideoElement,
    stream: MediaStream,
  ) {
    if (this.runningStreams.has(stream)) return;

    if (target.tagName === 'VIDEO') {
      const remoteVideo = target as HTMLVideoElement;
      remoteVideo.srcObject = stream;
      void remoteVideo.play();
      this.runningStreams.add(stream);
      return;
    }

    if ('MediaStreamTrackProcessor' in window) {
      const canvas = target as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx)
        throw new Error(
          `startStream: Could not get 2d canvas context for ${canvas.outerHTML}`,
        );
      const track = stream.getVideoTracks()[0]; // MediaStream.getVideoTracks()[0]
      const processor = new MediaStreamTrackProcessor({ track: track });
      const reader = processor.readable.getReader();
      const readChunk = function () {
        void reader.read().then(({ done, value }) => {
          if (!value) return;
          // the MediaStream video can have dynamic size based on bandwidth available
          if (
            canvas.width !== value.displayWidth ||
            canvas.height !== value.displayHeight
          ) {
            canvas.width = value.displayWidth;
            canvas.height = value.displayHeight;
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // value is a VideoFrame
          ctx.drawImage(value, 0, 0);
          value.close(); // close the VideoFrame when we're done with it
          if (!done) {
            readChunk();
          }
        });
      };
      readChunk();
      this.runningStreams.add(stream);
    } else {
      // Fallback for non-Chromium browsers.
      // Replaces the canvas element with a video element.

      const remoteVideo = document.createElement('video');
      remoteVideo.setAttribute('autoplay', 'true');
      remoteVideo.setAttribute('playsinline', 'true');

      // const { id } = mutation;
      remoteVideo.setAttribute('width', target.width.toString());
      remoteVideo.setAttribute('height', target.height.toString());
      target.replaceWith(remoteVideo);

      this.startStream(remoteVideo, stream);
    }
  }

  private peer: SimplePeer.Instance | null = null;
  private streamNodeMap = new Map<string, number>();
  private streams = new Set<MediaStream>();
  private runningStreams = new WeakSet<MediaStream>();
  public signalReceive(msg: RTCSessionDescriptionInit) {
    if (!this.peer) {
      this.peer = new SimplePeer({
        initiator: false,
        // trickle: false,
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
        // connected!
      });

      this.peer.on('data', (data: SimplePeer.SimplePeerData) => {
        try {
          const json = JSON.parse(data as string) as WebRTCDataChannel;
          this.streamNodeMap.set(json.streamId, json.nodeId);
        } catch (error) {
          console.error('Could not parse data', error);
        }
        this.flushStreams();
      });

      this.peer.on('stream', (stream: MediaStream) => {
        this.streams.add(stream);
        this.flushStreams();
      });
    }
    this.peer.signal(msg);
  }

  private flushStreams() {
    this.streams.forEach((stream) => {
      const nodeId = this.streamNodeMap.get(stream.id);
      if (!nodeId) return;
      const target = this.mirror?.getNode(nodeId) as
        | HTMLCanvasElement
        | HTMLVideoElement
        | null;
      // got remote video stream, now let's show it in a video or canvas element
      if (target) this.startStream(target, stream);
    });
  }
}
