// import type { SequentialIdOptions } from '../record';
import type { RRNode } from 'rrdom/es';
import type { Mirror } from 'rrweb-snapshot';
import SimplePeer from 'simple-peer-light';
import type { Replayer } from '../../../replay';
import type { ReplayPlugin } from '../../../types';
import type { WebRTCDataChannel } from '../types';

// TODO: restrict callback to real nodes only, or make sure callback gets called when real node gets added to dom as well

export class RRWebPluginCanvasWebRTCReplay {
  private canvasFoundCallback: (
    node: Node | RRNode,
    context: { id: number; replayer: Replayer },
  ) => void;
  private webRTCSignalCallback: (signal: RTCSessionDescriptionInit) => void;
  private mirror: Mirror;

  constructor(
    canvasFoundCallback: RRWebPluginCanvasWebRTCReplay['canvasFoundCallback'],
    webRTCSignalCallback: RRWebPluginCanvasWebRTCReplay['webRTCSignalCallback'],
  ) {
    this.canvasFoundCallback = canvasFoundCallback;
    this.webRTCSignalCallback = webRTCSignalCallback;
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
      getMirror: (mirror: Mirror) => {
        this.mirror = mirror;
      },
    };
  }

  private startStream(
    target: HTMLCanvasElement | HTMLVideoElement,
    stream: MediaStream,
  ) {
    if (target.tagName === 'VIDEO') {
      const remoteVideo = target as HTMLVideoElement;
      remoteVideo.srcObject = stream;
      void remoteVideo.play();
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
  private streamId: number;
  public setupWebRTC(msg: RTCSessionDescriptionInit) {
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
        // console.log('replay signal', data);
        this.webRTCSignalCallback(data);
      });

      this.peer.on('connect', () => {
        console.log('connect');
      });

      this.peer.on('data', (data: SimplePeer.SimplePeerData) => {
        try {
          const json = JSON.parse(data as string) as WebRTCDataChannel;
          this.streamId = json.id;
        } catch (error) {
          console.error('Could not parse data', error);
        }
      });

      this.peer.on('stream', (stream: MediaStream) => {
        // got remote video stream, now let's show it in a video or canvas element
        const target = this.mirror.getNode(this.streamId) as
          | HTMLCanvasElement
          | HTMLVideoElement;
        this.startStream(target, stream);
      });
    }
    this.peer.signal(msg);
  }

  public webRTCSignal(signal: RTCSessionDescriptionInit) {
    this.webRTCSignalCallback(signal);
  }
}
