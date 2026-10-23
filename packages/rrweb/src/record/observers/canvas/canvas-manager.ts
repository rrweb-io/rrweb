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
  DataURLOptions,
} from '@rrweb/types';
import { isBlocked } from '../../../utils';
import { CanvasContext } from '@rrweb/types';
import initCanvas2DMutationObserver from './2d';
import initCanvasContextObserver from './canvas';
import initCanvasWebGLMutationObserver from './webgl';
import ImageBitmapDataURLWorker from '../../workers/image-bitmap-data-url-worker?worker&inline';
import type { ImageBitmapDataURLRequestWorker } from '../../workers/image-bitmap-data-url-worker';

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
  private stopped = false;
  private animationFrames = new Set<number>();

  public reset() {
    if (this.stopped) return;
    this.stopped = true;
    this.animationFrames.forEach((id) => cancelAnimationFrame(id));
    this.animationFrames.clear();
    this.pendingCanvasMutations.clear();
    this.resetObservers && this.resetObservers();
  }

  private requestFrame(callback: FrameRequestCallback) {
    if (this.stopped) return;
    const id = requestAnimationFrame((timestamp) => {
      this.animationFrames.delete(id);
      if (!this.stopped) callback(timestamp);
    });
    this.animationFrames.add(id);
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
    blockSelector: string | null;
    mirror: Mirror;
    sampling?: 'all' | number;
    dataURLOptions: DataURLOptions;
  }) {
    const {
      sampling = 'all',
      win,
      blockClass,
      blockSelector,
      recordCanvas,
      dataURLOptions,
    } = options;
    this.mutationCb = options.mutationCb;
    this.mirror = options.mirror;

    if (recordCanvas && sampling === 'all')
      this.initCanvasMutationObserver(win, blockClass, blockSelector);
    if (recordCanvas && typeof sampling === 'number')
      this.initCanvasFPSObserver(sampling, win, blockClass, blockSelector, {
        dataURLOptions,
      });
  }

  private processMutation: canvasManagerMutationCallback = (
    target,
    mutation,
  ) => {
    if (this.stopped) return;
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
    blockSelector: string | null,
    options: {
      dataURLOptions: DataURLOptions;
    },
  ) {
    const canvasContextReset = initCanvasContextObserver(
      win,
      blockClass,
      blockSelector,
      true,
    );
    const snapshotInProgressMap: Map<number, boolean> = new Map();
    const worker =
      new ImageBitmapDataURLWorker() as ImageBitmapDataURLRequestWorker;
    worker.onmessage = (e) => {
      if (this.stopped) return;
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

    const getCanvas = (): HTMLCanvasElement[] => {
      const matchedCanvas: HTMLCanvasElement[] = [];
      win.document.querySelectorAll('canvas').forEach((canvas) => {
        if (!isBlocked(canvas, blockClass, blockSelector, true)) {
          matchedCanvas.push(canvas);
        }
      });
      return matchedCanvas;
    };

    const takeCanvasSnapshots = (timestamp: DOMHighResTimeStamp) => {
      if (
        lastSnapshotTime &&
        timestamp - lastSnapshotTime < timeBetweenSnapshots
      ) {
        this.requestFrame(takeCanvasSnapshots);
        return;
      }
      lastSnapshotTime = timestamp;

      getCanvas()
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        .forEach(async (canvas: HTMLCanvasElement) => {
          const id = this.mirror.getId(canvas);
          if (snapshotInProgressMap.get(id)) return;

          // The browser throws if the canvas is 0 in size
          // Uncaught (in promise) DOMException: Failed to execute 'createImageBitmap' on 'Window': The source image width is 0.
          // Assuming the same happens with height
          if (canvas.width === 0 || canvas.height === 0) return;

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
              // Preferably we set `preserveDrawingBuffer` to true, but that's not always possible,
              // especially when canvas is loaded before rrweb.
              // This hack can wipe the background color of the canvas in the (unlikely) event that
              // the canvas background was changed but clear was not called directly afterwards.
              // Example of this hack having negative side effect: https://visgl.github.io/react-map-gl/examples/layers
              context.clear(context.COLOR_BUFFER_BIT);
            }
          }
          const bitmap = await createImageBitmap(canvas);
          if (this.stopped) {
            bitmap.close();
            return;
          }
          worker.postMessage(
            {
              id,
              bitmap,
              width: canvas.width,
              height: canvas.height,
              dataURLOptions: options.dataURLOptions,
            },
            [bitmap],
          );
        });
      this.requestFrame(takeCanvasSnapshots);
    };

    this.requestFrame(takeCanvasSnapshots);

    this.resetObservers = () => {
      canvasContextReset();
      worker.onmessage = null;
      worker.terminate();
    };
  }

  private initCanvasMutationObserver(
    win: IWindow,
    blockClass: blockClass,
    blockSelector: string | null,
  ): void {
    this.startRAFTimestamping();
    this.startPendingCanvasMutationFlusher();

    const canvasContextReset = initCanvasContextObserver(
      win,
      blockClass,
      blockSelector,
      false,
    );
    const canvas2DReset = initCanvas2DMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      blockSelector,
    );

    const canvasWebGL1and2Reset = initCanvasWebGLMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      blockSelector,
    );

    this.resetObservers = () => {
      canvasContextReset();
      canvas2DReset();
      canvasWebGL1and2Reset();
    };
  }

  private startPendingCanvasMutationFlusher() {
    this.requestFrame(() => this.flushPendingCanvasMutations());
  }

  private startRAFTimestamping() {
    const setLatestRAFTimestamp = (timestamp: DOMHighResTimeStamp) => {
      this.rafStamps.latestId = timestamp;
      this.requestFrame(setLatestRAFTimestamp);
    };
    this.requestFrame(setLatestRAFTimestamp);
  }

  flushPendingCanvasMutations() {
    this.pendingCanvasMutations.forEach(
      (_values: canvasMutationCommand[], canvas: HTMLCanvasElement) => {
        const id = this.mirror.getId(canvas);
        this.flushPendingCanvasMutationFor(canvas, id);
      },
    );
    this.requestFrame(() => this.flushPendingCanvasMutations());
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
