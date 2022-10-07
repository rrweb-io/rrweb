import type { ICanvas, Mirror, DataURLOptions } from 'rrweb-snapshot';
import type {
  blockClass,
  canvasManagerMutationCallback,
  canvasMutationCallback,
  canvasMutationParam,
  canvasMutationCallbackWithSuccess,
  canvasMutationCommand,
  canvasMutationWithType,
  IWindow,
  listenerHandler,
  CanvasArg,
} from '../../../types';
import { isBlocked } from '../../../utils';
import { CanvasContext } from '../../../types';
import initCanvas2DMutationObserver from './2d';
import initCanvasContextObserver from './canvas';
import initCanvasWebGLMutationObserver from './webgl';
import ImageBitmapDataURLWorker from 'web-worker:../../workers/image-bitmap-data-url-worker.ts';
import type { ImageBitmapDataURLRequestWorker } from '../../workers/image-bitmap-data-url-worker';

export type RafStamps = { latestId: number; invokeId: number | null };

export class CanvasManager {
  private rafStamps: RafStamps = { latestId: 0, invokeId: null };
  private mirror: Mirror;

  private mutationCb: canvasMutationCallback;
  private resetObservers?: listenerHandler;
  private frozen = false;
  private locked = false;

  public reset() {
    pendingCanvasMutations.clear();
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

    // already been set up by rrwebInit(), but for another window context, e.g. https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world
    window.addEventListener('message', (m) => {
      if (m.data.type == 'rrweb_patch_internal_emission') {
        var canvases = document.getElementsByTagName('canvas');
        if (m.data.data.canvas_i < canvases.length) {
          var canvas = Array.from(canvases)[m.data.data.canvas_i];
          const id = this.mirror.getId(canvas);
          if (id === -1) {
            console.log(
              'bad - canvas on page but not processed by MutationObserver yet?',
            );
          }
          this.flushMutationEvent(
            canvas,
            m.data.data.mutationType,
            m.data.data.commands,
          );
        } else {
          console.log('bad', m.data);
        }
      }
    });
    window.postMessage({ type: 'rrweb_patch_reception_ready' });

    if (recordCanvas && sampling === 'all')
      this.resetObservers = initCanvasMutationObserver(
        this.flushMutationEvent.bind(this),
        win,
        blockClass,
        blockSelector,
      );
    if (recordCanvas && typeof sampling === 'number')
      this.initCanvasFPSObserver(sampling, win, blockClass, blockSelector, {
        dataURLOptions,
      });
  }

  private flushMutationEvent(
    canvas: HTMLCanvasElement,
    type: CanvasContext,
    commands: canvasMutationCommand[],
  ) {
    if (this.frozen || this.locked) {
      return false;
    }
    const id = this.mirror.getId(canvas);
    if (id === -1) {
      return false;
    }
    this.mutationCb({ id, type, commands });
    return true;
  }

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
    );
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
        rafId = requestAnimationFrame(takeCanvasSnapshots);
        return;
      }
      lastSnapshotTime = timestamp;

      getCanvas()
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
              dataURLOptions: options.dataURLOptions,
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
}

function initCanvasMutationObserver(
  flushMutationEvent: canvasMutationCallbackWithSuccess,
  win: IWindow,
  blockClass: blockClass,
  blockSelector: string | null,
) {
  requestAnimationFrame(flushPendingCanvasMutations);

  function flushPendingCanvasMutations() {
    pendingCanvasMutations.forEach(
      (values: canvasMutationCommand[], canvas: HTMLCanvasElement) => {
        let valuesWithType = pendingCanvasMutations.get(canvas);
        if (!valuesWithType) {
          return;
        }
        let commands = valuesWithType.map((value) => {
          const { type, ...rest } = value;
          return rest;
        });
        const { type } = valuesWithType[0];
        if (flushMutationEvent(canvas, type, commands)) {
          pendingCanvasMutations.delete(canvas);
        }
      },
    );
    requestAnimationFrame(flushPendingCanvasMutations);
  }

  const canvasContextReset = initCanvasContextObserver(
    win,
    blockClass,
    blockSelector,
  );
  const canvas2DReset = initCanvas2DMutationObserver(
    processMutation,
    win,
    blockClass,
    blockSelector,
  );

  const canvasWebGL1and2Reset = initCanvasWebGLMutationObserver(
    processMutation,
    win,
    blockClass,
    blockSelector,
  );

  return () => {
    canvasContextReset();
    canvas2DReset();
    canvasWebGL1and2Reset();
  };
}

const pendingCanvasMutations: pendingCanvasMutationsMap = new Map();

type pendingCanvasMutationsMap = Map<
  HTMLCanvasElement,
  canvasMutationWithType[]
>;

function processMutation(
  target: HTMLCanvasElement,
  mutation: canvasMutationWithType,
) {
  if (!pendingCanvasMutations.has(target)) {
    pendingCanvasMutations.set(target, []);
  }
  pendingCanvasMutations.get(target)!.push(mutation);
}

export function earlyPatch() {
  // dist/record/rrweb-init.js
  const win = window; // as this code is intended to be injected, we can just use the global window object

  // TODO: refactor blocking so that it happens in the emission callback function
  const blockClass = 'rr-block';
  const blockSelector = '';

  let rrweb_patch_reception_ready = false;
  window.addEventListener('message', (m) => {
    if (m.data.type == 'rrweb_patch_reception_ready') {
      rrweb_patch_reception_ready = true;
    }
  });

  initCanvasMutationObserver(
    function (canvas, type, commands) {
      if (!rrweb_patch_reception_ready) {
        return false;
      }
      // HACK: index the canvases by position; as postMessage is async this could send commands to the wrong canvas
      var canvases = document.getElementsByTagName('canvas');
      var canvas_i = Array.from(canvases).indexOf(canvas);
      if (canvas_i !== -1) {
        window.postMessage({
          type: 'rrweb_patch_internal_emission',
          data: {
            mutationType: type,
            canvas_i,
            commands,
          },
        });
        return true; // tell the manager that we've successfully flushed
      } else {
        return false;
      }
    },
    win,
    blockClass,
    blockSelector,
  );
}
