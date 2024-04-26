import { encode } from 'base64-arraybuffer';
import type { Mirror, DataURLOptions } from 'rrweb-snapshot';
import type {
  blockClass,
  canvasManagerMutationCallback,
  canvasMutationCallback,
  canvasMutationCommand,
  canvasMutationWithType,
  IWindow,
  listenerHandler,
  CanvasArg,
} from '@rrweb/types';
import { isBlocked } from '../../../utils';
import { CanvasContext } from '@rrweb/types';
import initCanvas2DMutationObserver from './2d';
import initCanvasWebGLMutationObserver from './webgl';

export type RafStamps = { latestId: number; invokeId: number | null };

type pendingCanvasMutationsMap = Map<
  HTMLCanvasElement,
  canvasMutationWithType[]
>;

export interface CanvasManagerConstructorOptions {
  recordCanvas: boolean;
  mutationCb: canvasMutationCallback;
  win: IWindow;
  blockClass: blockClass;
  blockSelector: string | null;
  mirror: Mirror;
  sampling?: 'all' | number;
  dataURLOptions: DataURLOptions;
}

export class CanvasManager {
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
    this.snapshotInProgressMap = new Map();
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
      recordCanvas,
      dataURLOptions,
    } = options;
    this.mutationCb = options.mutationCb;
    this.mirror = options.mirror;
    this.options = options;

    if (recordCanvas && sampling === 'all') {
      this.startRAFTimestamping();
      this.startPendingCanvasMutationFlusher();
    }
    if (recordCanvas && typeof sampling === 'number') {
      this.initCanvasFPSObserver(sampling, blockClass, blockSelector, {
        dataURLOptions,
      });
    }
    this.addWindow(win);
  }

  public addWindow(win: IWindow) {
    const {
      sampling = 'all',
      blockClass,
      blockSelector,
      recordCanvas,
    } = this.options;
    if (this.windowsSet.has(win)) return;

    if (recordCanvas && sampling === 'all') {
      this.initCanvasMutationObserver(win, blockClass, blockSelector);
    }
    this.windowsSet.add(win);
    this.windows.push(new WeakRef(win));
  }

  public addShadowRoot(shadowRoot: ShadowRoot) {
    this.shadowDoms.add(new WeakRef(shadowRoot));
  }

  public resetShadowRoots() {
    this.shadowDoms = new Set();
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
    options: {
      dataURLOptions: DataURLOptions;
    },
  ) {
    const timeBetweenSnapshots = 1000 / fps;
    let lastSnapshotTime = 0;
    const lastBlobMap: Map<number, string> = new Map();
    const transparentBlobMap: Map<string, string> = new Map();
    let rafId: number;

    const getCanvas = (): HTMLCanvasElement[] => {
      const matchedCanvas: HTMLCanvasElement[] = [];
      const searchCanvas = (root: Document | ShadowRoot) => {
        root.querySelectorAll('canvas').forEach((canvas) => {
          if (!isBlocked(canvas, blockClass, blockSelector, true)) {
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

    async function getTransparentBlobFor(
      width: number,
      height: number,
      dataURLOptions: DataURLOptions,
    ): Promise<string> {
      const id = `${width}-${height}`;
      if ('OffscreenCanvas' in globalThis) {
        if (transparentBlobMap.has(id)) return transparentBlobMap.get(id)!;
        const offscreen = new OffscreenCanvas(width, height);
        offscreen.getContext('2d'); // creates rendering context for `converToBlob`
        const blob = await offscreen.convertToBlob(dataURLOptions); // takes a while
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = encode(arrayBuffer); // cpu intensive
        transparentBlobMap.set(id, base64);
        return base64;
      } else {
        return '';
      }
    }

    const takeCanvasSnapshots = (timestamp: DOMHighResTimeStamp) => {
      if (!this.windows.length) {
        // exit loop if windows list is empty
        return;
      }
      if (
        lastSnapshotTime &&
        timestamp - lastSnapshotTime < timeBetweenSnapshots
      ) {
        rafId = requestAnimationFrame(takeCanvasSnapshots);
        return;
      }
      lastSnapshotTime = timestamp;

      getCanvas()
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        .forEach(async (canvas: HTMLCanvasElement) => {
          if (!this.mirror.hasNode(canvas)) {
            return;
          }
          const id = this.mirror.getId(canvas);
          if (this.snapshotInProgressMap.get(id)) return;

          // The browser throws if the canvas is 0 in size
          // Uncaught (in promise) DOMException: Failed to execute 'createImageBitmap' on 'Window': The source image width is 0.
          // Assuming the same happens with height
          if (canvas.width === 0 || canvas.height === 0) return;

          this.snapshotInProgressMap.set(id, true);

          const blob: Blob = await new Promise((resolve) => canvas.toBlob(file => resolve(file!), options.dataURLOptions.type, options.dataURLOptions.quality));
          const type = blob.type;
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = encode(arrayBuffer); // cpu intensive // TODO in post processing

          this.snapshotInProgressMap.set(id, false);
          if (!lastBlobMap.has(id) && (await getTransparentBlobFor(canvas.width, canvas.height, options.dataURLOptions)) === base64) {
            lastBlobMap.set(id, base64);
          }
          if (lastBlobMap.get(id) !== base64) {
            this.mutationCb({
              id,
              type: CanvasContext['2D'],
              commands: [
                {
                  property: 'clearRect', // wipe canvas
                  args: [0, 0, canvas.width, canvas.height],
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
            lastBlobMap.set(id, base64);
          }
        });
      rafId = requestAnimationFrame(takeCanvasSnapshots);
    };

    rafId = requestAnimationFrame(takeCanvasSnapshots);

    this.restoreHandlers.push(() => {
      cancelAnimationFrame(rafId);
    });
  }

  private initCanvasMutationObserver(
    win: IWindow,
    blockClass: blockClass,
    blockSelector: string | null,
  ): void {
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
      this.mirror,
    );

    this.restoreHandlers.push(() => {
      canvas2DReset();
      canvasWebGL1and2Reset();
    });
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
