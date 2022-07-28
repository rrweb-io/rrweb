import type { Replayer } from '..';
import {
  CanvasContext,
  canvasMutationCommand,
  canvasMutationData,
  canvasMutationParam,
  WebRTCDataChannel,
} from '../../types';
import webglMutation from './webgl';
import canvas2DMutation from './2d';
import SimplePeer from 'simple-peer-light';

export default async function canvasMutation({
  event,
  mutation,
  target,
  imageMap,
  canvasEventMap,
  errorHandler,
  mirror,
  webRTCSignalCallback,
}: {
  event: Parameters<Replayer['applyIncremental']>[0];
  mutation: canvasMutationData;
  target: HTMLCanvasElement;
  imageMap: Replayer['imageMap'];
  canvasEventMap: Replayer['canvasEventMap'];
  errorHandler: Replayer['warnCanvasMutationFailed'];
  mirror: Replayer['mirror'];
  webRTCSignalCallback: null | ((signal: RTCSessionDescriptionInit) => void);
}): Promise<void> {
  try {
    console.log('canvasMutation', mutation);
    const precomputedMutation: canvasMutationParam =
      canvasEventMap.get(event) || mutation;

    if (precomputedMutation.type === CanvasContext.WebRTC) {
      if (!webRTCSignalCallback)
        throw new Error(
          'webRTCSignalCallback is null, webRTC events will be ignored and Canvas or Video elements will be empty',
        );
      return setupWebRTC(precomputedMutation, webRTCSignalCallback, mirror);
    }

    const commands: canvasMutationCommand[] =
      'commands' in precomputedMutation
        ? precomputedMutation.commands
        : [precomputedMutation];

    if ([CanvasContext.WebGL, CanvasContext.WebGL2].includes(mutation.type)) {
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        await webglMutation({
          mutation: command,
          type: mutation.type,
          target,
          imageMap,
          errorHandler,
        });
      }
      return;
    }
    // default is '2d' for backwards compatibility (rrweb below 1.1.x)
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      await canvas2DMutation({
        event,
        mutation: command,
        target,
        imageMap,
        errorHandler,
      });
    }
  } catch (error) {
    errorHandler(mutation, error);
  }
}

function startStream(
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

    startStream(remoteVideo, stream);
  }
}

let peer: SimplePeer.Instance | null = null;
let streamId: number;
function setupWebRTC(
  mutation: canvasMutationParam & {
    type: CanvasContext.WebRTC;
  },
  webRTCSignalCallback: (signal: RTCSessionDescriptionInit) => void,
  mirror: Replayer['mirror'],
) {
  if (!peer) {
    peer = new SimplePeer({
      initiator: false,
      // trickle: false,
    });

    peer.on('error', (err: Error) => {
      peer = null;
      console.log('error', err);
    });

    peer.on('close', () => {
      peer = null;
      console.log('closing');
    });

    peer.on('signal', (data: RTCSessionDescriptionInit) => {
      webRTCSignalCallback(data);
    });

    peer.on('connect', () => {
      console.log('connect');
    });

    peer.on('data', (data: SimplePeer.SimplePeerData) => {
      try {
        const json = JSON.parse(data as string) as WebRTCDataChannel;
        streamId = json.id;
      } catch (error) {
        console.error('Could not parse data', error);
      }
    });

    peer.on('stream', (stream: MediaStream) => {
      // got remote video stream, now let's show it in a video or canvas element
      const target = mirror.getNode(streamId) as
        | HTMLCanvasElement
        | HTMLVideoElement;
      startStream(target, stream);
    });
  }
  peer.signal(mutation.msg);
}
