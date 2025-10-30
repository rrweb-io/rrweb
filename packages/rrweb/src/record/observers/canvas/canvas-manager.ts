import type { ICanvas, Mirror } from '@junify-app/rrweb-snapshot';
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
  ImageBitmapDataURLProcessor,
  ImageBitmapDataURLWorkerResponse,
} from '@junify-app/types';
import { isBlocked } from '../../../utils';
import { CanvasContext } from '@junify-app/types';
import initCanvas2DMutationObserver from './2d';
import initCanvasContextObserver from './canvas';
import initCanvasWebGLMutationObserver from './webgl';
import { createInlineImageBitmapProcessor } from '../../workers/image-bitmap-data-url-processor';

const warmUpWebGLContext = (
  context: WebGLRenderingContext | WebGL2RenderingContext,
): void => {
  try {
    const buffer = new Uint8Array(4);
    context.readPixels(0, 0, 1, 1, context.RGBA, context.UNSIGNED_BYTE, buffer);
    if ('finish' in context && typeof context.finish === 'function') {
      context.finish();
    } else if ('flush' in context && typeof context.flush === 'function') {
      context.flush();
    }
  } catch (_error) {
    // ignore failures; fallback processing will handle empty frames
  }
};

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
  private processImageBitmap: ImageBitmapDataURLProcessor;

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
    blockSelector: string | null;
    mirror: Mirror;
    sampling?: 'all' | number;
    dataURLOptions: DataURLOptions;
    imageBitmapProcessor?: ImageBitmapDataURLProcessor;
  }) {
    const {
      sampling = 'all',
      win,
      blockClass,
      blockSelector,
      recordCanvas,
      dataURLOptions,
      imageBitmapProcessor,
    } = options;
    this.mutationCb = options.mutationCb;
    this.mirror = options.mirror;
    this.processImageBitmap =
      imageBitmapProcessor ?? createInlineImageBitmapProcessor();

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

    const timeBetweenSnapshots = 1000 / fps;
    let lastSnapshotTime = 0;
    let rafId: number;

    const getCanvas = (): HTMLCanvasElement[] => {
      const matchedCanvas: HTMLCanvasElement[] = [];
      const queue: Array<ParentNode> = [win.document];
      const visited = new Set<ParentNode>();

      while (queue.length) {
        const current = queue.shift()!;
        if (visited.has(current)) {
          continue;
        }
        visited.add(current);

        if ('querySelectorAll' in current) {
          try {
            (current as Document | DocumentFragment)
              .querySelectorAll('canvas')
              .forEach((canvas) => {
                if (!isBlocked(canvas, blockClass, blockSelector, true)) {
                  matchedCanvas.push(canvas);
                }
              });
          } catch (_error) {
            // ignore failures when traversing DOM/shadow roots
          }
        }

        if ('childNodes' in current) {
          current.childNodes.forEach((node) => {
            if (node instanceof Element && node.shadowRoot) {
              queue.push(node.shadowRoot);
            }
          });
        }
      }

      return matchedCanvas;
    };

    const takeCanvasSnapshots = (timestamp: DOMHighResTimeStamp) => {
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
          const id = this.mirror.getId(canvas);
          if (snapshotInProgressMap.get(id)) return;

          // The browser throws if the canvas is 0 in size
          // Uncaught (in promise) DOMException: Failed to execute 'createImageBitmap' on 'Window': The source image width is 0.
          // Assuming the same happens with height
          if (canvas.width === 0 || canvas.height === 0) return;

          snapshotInProgressMap.set(id, true);
          const contextType = (canvas as ICanvas).__context;
          if (['webgl', 'webgl2'].includes(contextType)) {
            // if the canvas hasn't been modified recently,
            // its contents won't be in memory and `createImageBitmap`
            // will return a transparent imageBitmap

            const context = canvas.getContext(contextType) as
              | WebGLRenderingContext
              | WebGL2RenderingContext
              | null;
            if (
              context?.getContextAttributes()?.preserveDrawingBuffer === false
            ) {
              // Hack to load canvas back into memory so `createImageBitmap` can grab its contents
              // without wiping the color buffer. Historically we called `context.clear`, but that
              // can erase app visuals (e.g. react-map-gl). Sampling a single pixel keeps the buffer
              // resident while preserving what the page drew.
              warmUpWebGLContext(context);
            }
          }
          try {
            const bitmap = await createImageBitmap(canvas);
            let response: ImageBitmapDataURLWorkerResponse =
              await this.processImageBitmap({
                id,
                bitmap,
                width: canvas.width,
                height: canvas.height,
                dataURLOptions: options.dataURLOptions,
              });

            if (!('base64' in response) && contextType === 'webgpu') {
              let fallbackBase64: string | null = null;
              let fallbackType: string | null = null;
              try {
                const dataUrl = canvas.toDataURL(
                  options.dataURLOptions.type,
                  options.dataURLOptions.quality,
                );
                const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
                if (match) {
                  fallbackType = match[1];
                  fallbackBase64 = match[2];
                }
              } catch (_error) {
                // ignore dataURL failures; response will remain empty
              }

              if (fallbackBase64 && fallbackType) {
                response = {
                  id,
                  base64: fallbackBase64,
                  type: fallbackType,
                  width: canvas.width,
                  height: canvas.height,
                };
              }
            }

            if ('base64' in response) {
              const { base64, type, width, height } = response;
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
            }
          } catch (error) {
            console.warn('[rrweb] Failed to process canvas snapshot', error);
          } finally {
            snapshotInProgressMap.set(id, false);
          }
        });
      rafId = requestAnimationFrame(takeCanvasSnapshots);
    };

    rafId = requestAnimationFrame(takeCanvasSnapshots);

    this.resetObservers = () => {
      canvasContextReset();
      cancelAnimationFrame(rafId);
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
      (_values: canvasMutationCommand[], canvas: HTMLCanvasElement) => {
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
