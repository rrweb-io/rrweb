import type {
  ICanvas,
  Mirror,
  DataURLOptions,
} from '@sentry-internal/rrweb-snapshot';
import type {
  blockClass,
  canvasManagerMutationCallback,
  canvasMutationCallback,
  canvasMutationCommand,
  canvasMutationWithType,
  IWindow,
  listenerHandler,
  CanvasArg,
  ImageBitmapDataURLWorkerResponse,
} from '@sentry-internal/rrweb-types';
import { isBlocked, onRequestAnimationFrame } from '../../../utils';
import { CanvasContext } from '@sentry-internal/rrweb-types';
import initCanvas2DMutationObserver from './2d';
import initCanvasContextObserver from './canvas';
import initCanvasWebGLMutationObserver from './webgl';
import { getImageBitmapDataUrlWorkerURL } from '@sentry-internal/rrweb-worker';
import { callbackWrapper, registerErrorHandler } from '../../error-handler';
import type { ErrorHandler } from '../../../types';

export type RafStamps = { latestId: number; invokeId: number | null };

type pendingCanvasMutationsMap = Map<
  HTMLCanvasElement,
  canvasMutationWithType[]
>;

export interface CanvasManagerInterface {
  reset(): void;
  freeze(): void;
  unfreeze(): void;
  lock(): void;
  unlock(): void;
  snapshot(canvasElement?: HTMLCanvasElement): void;
  addWindow(win: IWindow): void;
  addShadowRoot(shadowRoot: ShadowRoot): void;
  resetShadowRoots(): void;
}

export interface CanvasManagerConstructorOptions {
  recordCanvas: boolean;
  enableManualSnapshot?: boolean;
  mutationCb: canvasMutationCallback;
  win: IWindow;
  blockClass: blockClass;
  blockSelector: string | null;
  unblockSelector: string | null;
  mirror: Mirror;
  dataURLOptions: DataURLOptions;
  errorHandler?: ErrorHandler;
  sampling?: 'all' | number;
}

export class CanvasManagerNoop implements CanvasManagerInterface {
  public reset() {
    // noop
  }
  public freeze() {
    // noop
  }
  public unfreeze() {
    // noop
  }
  public lock() {
    // noop
  }
  public unlock() {
    // noop
  }
  public snapshot() {
    // noop
  }
  public addWindow() {
    // noop
  }

  public addShadowRoot() {
    // noop
  }

  public resetShadowRoots() {
    // noop
  }
}

export class CanvasManager implements CanvasManagerInterface {
  private pendingCanvasMutations: pendingCanvasMutationsMap = new Map();
  private rafStamps: RafStamps = { latestId: 0, invokeId: null };
  private options: CanvasManagerConstructorOptions;
  private mirror: Mirror;

  private shadowDoms = new Set<WeakRef<ShadowRoot>>();
  private windowsSet = new WeakSet<IWindow>();
  private windows: WeakRef<IWindow>[] = [];

  private mutationCb: canvasMutationCallback;
  private restoreHandlers: listenerHandler[] = [];
  private frozen = false;
  private locked = false;

  private snapshotInProgressMap: Map<number, boolean> = new Map();
  private worker: Worker | null = null;

  public reset() {
    this.pendingCanvasMutations.clear();
    this.restoreHandlers.forEach((handler) => {
      try {
        handler();
      } catch (e) {
        //
      }
    });
    this.restoreHandlers = [];
    this.windowsSet = new WeakSet();
    this.windows = [];
    this.shadowDoms = new Set();
    this.worker?.terminate();
    this.worker = null;
    this.snapshotInProgressMap = new Map();
    if (
      (this.options.recordCanvas &&
        typeof this.options.sampling === 'number') ||
      this.options.enableManualSnapshot
    ) {
      this.worker = this.initFPSWorker();
    }
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

  constructor(options: CanvasManagerConstructorOptions) {
    const {
      sampling = 'all',
      win,
      blockClass,
      blockSelector,
      unblockSelector,
      recordCanvas,
      dataURLOptions,
      errorHandler,
    } = options;
    this.mutationCb = options.mutationCb;
    this.mirror = options.mirror;
    this.options = options;

    if (errorHandler) {
      registerErrorHandler(errorHandler);
    }
    if (
      (recordCanvas && typeof sampling === 'number') ||
      options.enableManualSnapshot
    ) {
      this.worker = this.initFPSWorker();
    }
    if (options.enableManualSnapshot) {
      return;
    }
    callbackWrapper(() => {
      if (recordCanvas && sampling === 'all') {
        this.startRAFTimestamping();
        this.startPendingCanvasMutationFlusher();
      }
      if (recordCanvas && typeof sampling === 'number') {
        this.initCanvasFPSObserver(
          sampling,
          blockClass,
          blockSelector,
          unblockSelector,
          {
            dataURLOptions,
          },
        );
      }
    })();
    this.addWindow(win);
  }

  public addWindow(win: IWindow) {
    const {
      sampling = 'all',
      blockClass,
      blockSelector,
      unblockSelector,
      recordCanvas,
      enableManualSnapshot,
    } = this.options;
    if (this.windowsSet.has(win)) return;

    if (enableManualSnapshot) {
      this.windowsSet.add(win);
      this.windows.push(new WeakRef(win));
      return;
    }

    callbackWrapper(() => {
      if (recordCanvas && sampling === 'all') {
        this.initCanvasMutationObserver(
          win,
          blockClass,
          blockSelector,
          unblockSelector,
        );
      }
      if (recordCanvas && typeof sampling === 'number') {
        const canvasContextReset = initCanvasContextObserver(
          win,
          blockClass,
          blockSelector,
          unblockSelector,
          true,
        );
        this.restoreHandlers.push(() => {
          canvasContextReset();
        });
      }
    })();
    this.windowsSet.add(win);
    this.windows.push(new WeakRef(win));
  }

  public addShadowRoot(shadowRoot: ShadowRoot) {
    this.shadowDoms.add(new WeakRef(shadowRoot));
  }

  public resetShadowRoots() {
    this.shadowDoms = new Set();
  }

  private initFPSWorker(): Worker {
    const worker = new Worker(getImageBitmapDataUrlWorkerURL());
    worker.onmessage = (e) => {
      const data = e.data as ImageBitmapDataURLWorkerResponse;
      const { id } = data;
      this.snapshotInProgressMap.set(id, false);

      if (!('base64' in data)) return;

      const { base64, type, width, height } = data;
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
    return worker;
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
    blockClass: blockClass,
    blockSelector: string | null,
    unblockSelector: string | null,
    options: {
      dataURLOptions: DataURLOptions;
    },
  ) {
    const rafId = this.takeSnapshot(
      false,
      fps,
      blockClass,
      blockSelector,
      unblockSelector,
      options.dataURLOptions,
    );

    this.restoreHandlers.push(() => {
      cancelAnimationFrame(rafId);
    });
  }

  private initCanvasMutationObserver(
    win: IWindow,
    blockClass: blockClass,
    blockSelector: string | null,
    unblockSelector: string | null,
  ): void {
    const canvasContextReset = initCanvasContextObserver(
      win,
      blockClass,
      blockSelector,
      unblockSelector,
      false,
    );
    const canvas2DReset = initCanvas2DMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      blockSelector,
      unblockSelector,
    );

    const canvasWebGL1and2Reset = initCanvasWebGLMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      blockSelector,
      unblockSelector,
      this.mirror,
    );

    this.restoreHandlers.push(() => {
      canvasContextReset();
      canvas2DReset();
      canvasWebGL1and2Reset();
    });
  }

  public snapshot(canvasElement?: HTMLCanvasElement) {
    const { options } = this;
    const rafId = this.takeSnapshot(
      true,
      options.sampling === 'all' ? 2 : options.sampling || 2,
      options.blockClass,
      options.blockSelector,
      options.unblockSelector,
      options.dataURLOptions,
      canvasElement,
    );

    this.restoreHandlers.push(() => {
      cancelAnimationFrame(rafId);
    });
  }

  private takeSnapshot(
    isManualSnapshot: boolean,
    fps: number,
    blockClass: blockClass,
    blockSelector: string | null,
    unblockSelector: string | null,
    dataURLOptions: DataURLOptions,
    canvasElement?: HTMLCanvasElement,
  ) {
    const timeBetweenSnapshots = 1000 / fps;
    let lastSnapshotTime = 0;
    let rafId: number;

    const getCanvas = (
      canvasElement?: HTMLCanvasElement,
    ): HTMLCanvasElement[] => {
      if (canvasElement) {
        return [canvasElement];
      }

      const matchedCanvas: HTMLCanvasElement[] = [];

      const searchCanvas = (root: Document | ShadowRoot) => {
        root.querySelectorAll('canvas').forEach((canvas) => {
          if (
            !isBlocked(canvas, blockClass, blockSelector, unblockSelector, true)
          ) {
            matchedCanvas.push(canvas);
          }
        });
      };

      for (const item of this.windows) {
        const window = item.deref();
        if (window) {
          searchCanvas(window.document);
        }
      }

      for (const item of this.shadowDoms) {
        const shadowRoot = item.deref();
        if (shadowRoot) {
          searchCanvas(shadowRoot);
        }
      }
      return matchedCanvas;
    };

    const takeCanvasSnapshots = (timestamp: DOMHighResTimeStamp) => {
      if (!this.windows.length) {
        // exit loop if windows list is empty
        return;
      }
      if (
        lastSnapshotTime &&
        timestamp - lastSnapshotTime < timeBetweenSnapshots
      ) {
        rafId = onRequestAnimationFrame(takeCanvasSnapshots);
        return;
      }
      lastSnapshotTime = timestamp;

      getCanvas(canvasElement).forEach((canvas: HTMLCanvasElement) => {
        if (!this.mirror.hasNode(canvas)) {
          return;
        }
        const id = this.mirror.getId(canvas);
        if (this.snapshotInProgressMap.get(id)) return;
        this.snapshotInProgressMap.set(id, true);
        if (
          !isManualSnapshot &&
          ['webgl', 'webgl2'].includes((canvas as ICanvas).__context)
        ) {
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

        createImageBitmap(canvas)
          .then((bitmap) => {
            this.worker?.postMessage(
              {
                id,
                bitmap,
                width: canvas.width,
                height: canvas.height,
                dataURLOptions,
              },
              [bitmap],
            );
          })
          .catch((error) => {
            callbackWrapper(() => {
              throw error;
            })();
          });
      });
      rafId = onRequestAnimationFrame(takeCanvasSnapshots);
    };

    rafId = onRequestAnimationFrame(takeCanvasSnapshots);
    return rafId;
  }

  private startPendingCanvasMutationFlusher() {
    onRequestAnimationFrame(() => this.flushPendingCanvasMutations());
  }

  private startRAFTimestamping() {
    const setLatestRAFTimestamp = (timestamp: DOMHighResTimeStamp) => {
      this.rafStamps.latestId = timestamp;
      onRequestAnimationFrame(setLatestRAFTimestamp);
    };
    onRequestAnimationFrame(setLatestRAFTimestamp);
  }

  flushPendingCanvasMutations() {
    this.pendingCanvasMutations.forEach(
      (values: canvasMutationCommand[], canvas: HTMLCanvasElement) => {
        const id = this.mirror.getId(canvas);
        this.flushPendingCanvasMutationFor(canvas, id);
      },
    );
    onRequestAnimationFrame(() => this.flushPendingCanvasMutations());
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
