import type { Replayer } from '..';
import {
  CanvasContext,
  canvasMutationCommand,
  canvasMutationData,
  canvasMutationParam,
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
}: {
  event: Parameters<Replayer['applyIncremental']>[0];
  mutation: canvasMutationData;
  target: HTMLCanvasElement;
  imageMap: Replayer['imageMap'];
  canvasEventMap: Replayer['canvasEventMap'];
  errorHandler: Replayer['warnCanvasMutationFailed'];
}): Promise<void> {
  try {
    const precomputedMutation: canvasMutationParam =
      canvasEventMap.get(event) || mutation;

    if (precomputedMutation.type === CanvasContext.WebRTC) {
      return setupWebRTC(precomputedMutation, target);
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

function setupWebRTC(
  mutation: canvasMutationParam & {
    type: CanvasContext.WebRTC;
  },
  target: HTMLCanvasElement | HTMLVideoElement,
  // mirror: Replayer['mirror'],
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const p = ((window as any).p = new SimplePeer({
    initiator: false,
    trickle: false,
  }));

  p.on('error', (err: Error) => console.log('error', err));

  p.on('signal', (data: SimplePeer.SignalData) => {
    console.log('SIGNAL', JSON.stringify(data));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    _signal(JSON.stringify(data));
  });

  p.on('connect', () => {
    console.log('CONNECT');
  });

  // p.on('data', (data) => {
  //   console.log('data: ', data);
  // });

  p.on('stream', (stream: MediaStream) => {
    // got remote video stream, now let's show it in a video or canvas element
    startStream(target, stream);
  });

  p.signal(mutation.msg);
}
