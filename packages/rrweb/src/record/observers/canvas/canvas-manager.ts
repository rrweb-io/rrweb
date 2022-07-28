import type { ICanvas, Mirror } from 'rrweb-snapshot';
import type {
  blockClass,
  canvasManagerMutationCallback,
  canvasMutationCallback,
  canvasMutationCommand,
  canvasMutationWithType,
  IWindow,
  listenerHandler,
  CanvasArg,
} from '../../../types';
import { CanvasContext } from '../../../types';
import initCanvas2DMutationObserver from './2d';
import initCanvasContextObserver from './canvas';
import initCanvasWebGLMutationObserver from './webgl';
import ImageBitmapDataURLWorker from 'web-worker:../../workers/image-bitmap-data-url-worker.ts';
import type { ImageBitmapDataURLRequestWorker } from '../../workers/image-bitmap-data-url-worker';
import SimplePeer from 'simple-peer-light';

export type RafStamps = { latestId: number; invokeId: number | null };

type pendingCanvasMutationsMap = Map<
  HTMLCanvasElement,
  canvasMutationWithType[]
>;

export class CanvasManager {
  private pendingCanvasMutations: pendingCanvasMutationsMap = new Map();
  private rafStamps: RafStamps = { latestId: 0, invokeId: null };
  private mirror: Mirror;

  private mutationCb: canvasMutationCallback;
  private resetObservers?: listenerHandler;
  private frozen = false;
  private locked = false;

  public reset() {
    this.pendingCanvasMutations.clear();
    this.resetObservers && this.resetObservers();
  }

  public freeze() {
    this.frozen = true;
  }

  public unfreeze() {
    this.frozen = false;
  }

  public lock() {
    this.locked = true;
  }

  public unlock() {
    this.locked = false;
  }

  constructor(options: {
    recordCanvas: boolean;
    mutationCb: canvasMutationCallback;
    win: IWindow;
    blockClass: blockClass;
    mirror: Mirror;
    sampling?: 'all' | 'webrtc' | number;
  }) {
    const { sampling = 'all', win, blockClass, recordCanvas } = options;
    this.mutationCb = options.mutationCb;
    this.mirror = options.mirror;

    if (recordCanvas && sampling === 'webrtc')
      this.initCanvasWebRTCObserver(win, blockClass);
    if (recordCanvas && sampling === 'all')
      this.initCanvasMutationObserver(win, blockClass);
    if (recordCanvas && typeof sampling === 'number')
      this.initCanvasFPSObserver(sampling, win, blockClass);
  }

  private processMutation: canvasManagerMutationCallback = (
    target,
    mutation,
  ) => {
    const newFrame =
      this.rafStamps.invokeId &&
      this.rafStamps.latestId !== this.rafStamps.invokeId;
    if (newFrame || !this.rafStamps.invokeId)
      this.rafStamps.invokeId = this.rafStamps.latestId;

    if (!this.pendingCanvasMutations.has(target)) {
      this.pendingCanvasMutations.set(target, []);
    }

    this.pendingCanvasMutations.get(target)!.push(mutation);
  };

  private initCanvasFPSObserver(
    fps: number,
    win: IWindow,
    blockClass: blockClass,
  ) {
    const canvasContextReset = initCanvasContextObserver(win, blockClass);
    const snapshotInProgressMap: Map<number, boolean> = new Map();
    const worker = new ImageBitmapDataURLWorker() as ImageBitmapDataURLRequestWorker;
    worker.onmessage = (e) => {
      const { id } = e.data;
      snapshotInProgressMap.set(id, false);

      if (!('base64' in e.data)) return;

      const { base64, type, width, height } = e.data;
      this.mutationCb({
        id,
        type: CanvasContext['2D'],
        commands: [
          {
            property: 'clearRect', // wipe canvas
            args: [0, 0, width, height],
          },
          {
            property: 'drawImage', // draws (semi-transparent) image
            args: [
              {
                rr_type: 'ImageBitmap',
                args: [
                  {
                    rr_type: 'Blob',
                    data: [{ rr_type: 'ArrayBuffer', base64 }],
                    type,
                  },
                ],
              } as CanvasArg,
              0,
              0,
            ],
          },
        ],
      });
    };

    const timeBetweenSnapshots = 1000 / fps;
    let lastSnapshotTime = 0;
    let rafId: number;

    const takeCanvasSnapshots = (timestamp: DOMHighResTimeStamp) => {
      if (
        lastSnapshotTime &&
        timestamp - lastSnapshotTime < timeBetweenSnapshots
      ) {
        rafId = requestAnimationFrame(takeCanvasSnapshots);
        return;
      }
      lastSnapshotTime = timestamp;

      win.document
        .querySelectorAll(`canvas:not(.${blockClass as string} *)`)
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        .forEach(async (canvas: HTMLCanvasElement) => {
          const id = this.mirror.getId(canvas);
          if (snapshotInProgressMap.get(id)) return;
          snapshotInProgressMap.set(id, true);
          if (['webgl', 'webgl2'].includes((canvas as ICanvas).__context)) {
            // if the canvas hasn't been modified recently,
            // its contents won't be in memory and `createImageBitmap`
            // will return a transparent imageBitmap

            const context = canvas.getContext((canvas as ICanvas).__context) as
              | WebGLRenderingContext
              | WebGL2RenderingContext
              | null;
            if (
              context?.getContextAttributes()?.preserveDrawingBuffer === false
            ) {
              // Hack to load canvas back into memory so `createImageBitmap` can grab it's contents.
              // Context: https://twitter.com/Juice10/status/1499775271758704643
              // This hack might change the background color of the canvas in the unlikely event that
              // the canvas background was changed but clear was not called directly afterwards.
              context?.clear(context.COLOR_BUFFER_BIT);
            }
          }
          const bitmap = await createImageBitmap(canvas);
          worker.postMessage(
            {
              id,
              bitmap,
              width: canvas.width,
              height: canvas.height,
            },
            [bitmap],
          );
        });
      rafId = requestAnimationFrame(takeCanvasSnapshots);
    };

    rafId = requestAnimationFrame(takeCanvasSnapshots);

    this.resetObservers = () => {
      canvasContextReset();
      cancelAnimationFrame(rafId);
    };
  }

  // private sdpOffer: RTCSessionDescriptionInit;

  private setupPeer(id: number, stream: MediaStream) {
    console.log('setupPeer', id);
    const p = new SimplePeer({
      initiator: true,
      stream,
      trickle: false, // only send one WebRTC offer per canvas
    });

    (window as any).p = p;

    p.on('signal', (data: RTCSessionDescriptionInit) => {
      this.mutationCb({
        id,
        type: CanvasContext.WebRTC,
        msg: data,
        stream,
      });
    });

    p.on('connect', () => {
      // eslint-disable-next-line prefer-rest-params
      console.log('connected', arguments);
    });
  }

  private initCanvasWebRTCObserver(win: IWindow, blockClass: blockClass) {
    const canvasContextReset = initCanvasContextObserver(win, blockClass);
    const streamMap: Map<number, MediaStream> = new Map();
    let rafId: number;

    const captureStreams = () => {
      win.document
        .querySelectorAll(`canvas:not(.${blockClass as string} *)`)
        .forEach((canvas: HTMLCanvasElement) => {
          const id = this.mirror.getId(canvas);
          if (streamMap.has(id)) return;

          // streamMap.set(id, (null as unknown) as MediaStream);
          // setTimeout(() => {
          console.log('captureStream', canvas, canvas.width, canvas.height);
          const stream = canvas.captureStream();
          streamMap.set(id, stream);
          this.setupPeer(id, stream);
          // }, 2000);
        });
      rafId = requestAnimationFrame(captureStreams);
    };

    rafId = requestAnimationFrame(captureStreams);

    this.resetObservers = () => {
      canvasContextReset();
      cancelAnimationFrame(rafId);
    };
  }

  private initCanvasMutationObserver(
    win: IWindow,
    blockClass: blockClass,
  ): void {
    this.startRAFTimestamping();
    this.startPendingCanvasMutationFlusher();

    const canvasContextReset = initCanvasContextObserver(win, blockClass);
    const canvas2DReset = initCanvas2DMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      this.mirror,
    );

    const canvasWebGL1and2Reset = initCanvasWebGLMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      this.mirror,
    );

    this.resetObservers = () => {
      canvasContextReset();
      canvas2DReset();
      canvasWebGL1and2Reset();
    };
  }

  private startPendingCanvasMutationFlusher() {
    requestAnimationFrame(() => this.flushPendingCanvasMutations());
  }

  private startRAFTimestamping() {
    const setLatestRAFTimestamp = (timestamp: DOMHighResTimeStamp) => {
      this.rafStamps.latestId = timestamp;
      requestAnimationFrame(setLatestRAFTimestamp);
    };
    requestAnimationFrame(setLatestRAFTimestamp);
  }

  flushPendingCanvasMutations() {
    this.pendingCanvasMutations.forEach(
      (values: canvasMutationCommand[], canvas: HTMLCanvasElement) => {
        const id = this.mirror.getId(canvas);
        this.flushPendingCanvasMutationFor(canvas, id);
      },
    );
    requestAnimationFrame(() => this.flushPendingCanvasMutations());
  }

  flushPendingCanvasMutationFor(canvas: HTMLCanvasElement, id: number) {
    if (this.frozen || this.locked) {
      return;
    }

    const valuesWithType = this.pendingCanvasMutations.get(canvas);
    if (!valuesWithType || id === -1) return;

    const values = valuesWithType.map((value) => {
      const { type, ...rest } = value;
      return rest;
    });
    const { type } = valuesWithType[0];

    this.mutationCb({ id, type, commands: values });

    this.pendingCanvasMutations.delete(canvas);
  }
}
