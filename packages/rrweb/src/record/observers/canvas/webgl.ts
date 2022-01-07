import { INode } from 'rrweb-snapshot';
import {
  blockClass,
  CanvasContext,
  canvasMutationCallback,
  canvasMutationCommand,
  IWindow,
  listenerHandler,
  Mirror,
} from '../../../types';
import { hookSetter, isBlocked, patch } from '../../../utils';
import { saveWebGLVar, serializeArgs } from './serialize-args';

type canvasMutationWithType = { type: CanvasContext } & canvasMutationCommand;
type pendingCanvasMutationsMap = Map<
  HTMLCanvasElement,
  canvasMutationWithType[]
>;
type RafStamps = { latestId: number; invokeId: number | null };

function flushPendingCanvasMutations(
  pendingCanvasMutations: pendingCanvasMutationsMap,
  cb: canvasMutationCallback,
  mirror: Mirror,
) {
  pendingCanvasMutations.forEach(
    (values: canvasMutationCommand[], canvas: HTMLCanvasElement) => {
      const id = mirror.getId((canvas as unknown) as INode);
      flushPendingCanvasMutationFor(canvas, pendingCanvasMutations, id, cb);
    },
  );
  requestAnimationFrame(() =>
    flushPendingCanvasMutations(pendingCanvasMutations, cb, mirror),
  );
}

function flushPendingCanvasMutationFor(
  canvas: HTMLCanvasElement,
  pendingCanvasMutations: pendingCanvasMutationsMap,
  id: number,
  cb: canvasMutationCallback,
) {
  const valuesWithType = pendingCanvasMutations.get(canvas);
  if (!valuesWithType || id === -1) return;

  const values = valuesWithType.map((value) => {
    const { type, ...rest } = value;
    return rest;
  });
  const { type } = valuesWithType[0];

  cb({ id, type, commands: values });

  pendingCanvasMutations.delete(canvas);
}

function patchGLPrototype(
  prototype: WebGLRenderingContext | WebGL2RenderingContext,
  type: CanvasContext,
  cb: canvasMutationCallback,
  blockClass: blockClass,
  mirror: Mirror,
  pendingCanvasMutations: pendingCanvasMutationsMap,
  rafStamps: RafStamps,
  win: IWindow,
): listenerHandler[] {
  const handlers: listenerHandler[] = [];

  const props = Object.getOwnPropertyNames(prototype);

  for (const prop of props) {
    try {
      if (typeof prototype[prop as keyof typeof prototype] !== 'function') {
        continue;
      }
      const restoreHandler = patch(prototype, prop, function (original) {
        return function (this: typeof prototype, ...args: Array<unknown>) {
          const newFrame =
            rafStamps.invokeId && rafStamps.latestId !== rafStamps.invokeId;
          if (newFrame || !rafStamps.invokeId)
            rafStamps.invokeId = rafStamps.latestId;

          const result = original.apply(this, args);
          saveWebGLVar(result, win, prototype);
          if (!isBlocked((this.canvas as unknown) as INode, blockClass)) {
            const id = mirror.getId((this.canvas as unknown) as INode);

            const recordArgs = serializeArgs([...args], win, prototype);
            const mutation: canvasMutationWithType = {
              type,
              property: prop,
              args: recordArgs,
            };

            if (!pendingCanvasMutations.has(this.canvas as HTMLCanvasElement)) {
              pendingCanvasMutations.set(this.canvas as HTMLCanvasElement, []);
            }

            pendingCanvasMutations
              // FIXME! THIS COULD MAYBE BE AN OFFSCREEN CANVAS
              .get(this.canvas as HTMLCanvasElement)!
              .push(mutation);
          }

          return result;
        };
      });
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter<typeof prototype>(prototype, prop, {
        set(v) {
          cb({
            id: mirror.getId((this.canvas as unknown) as INode),
            type,
            property: prop,
            args: [v],
            setter: true,
          });
        },
      });
      handlers.push(hookHandler);
    }
  }

  return handlers;
}

export default function initCanvasWebGLMutationObserver(
  cb: canvasMutationCallback,
  win: IWindow,
  blockClass: blockClass,
  mirror: Mirror,
): listenerHandler {
  const handlers: listenerHandler[] = [];
  const pendingCanvasMutations: pendingCanvasMutationsMap = new Map();

  const rafStamps: RafStamps = {
    latestId: 0,
    invokeId: null,
  };

  const setLatestRAFTimestamp = (timestamp: DOMHighResTimeStamp) => {
    rafStamps.latestId = timestamp;
    requestAnimationFrame(setLatestRAFTimestamp);
  };
  requestAnimationFrame(setLatestRAFTimestamp);

  // TODO: replace me
  requestAnimationFrame(() =>
    flushPendingCanvasMutations(pendingCanvasMutations, cb, mirror),
  );

  handlers.push(
    ...patchGLPrototype(
      win.WebGLRenderingContext.prototype,
      CanvasContext.WebGL,
      cb,
      blockClass,
      mirror,
      pendingCanvasMutations,
      rafStamps,
      win,
    ),
  );

  if (typeof win.WebGL2RenderingContext !== 'undefined') {
    handlers.push(
      ...patchGLPrototype(
        win.WebGL2RenderingContext.prototype,
        CanvasContext.WebGL2,
        cb,
        blockClass,
        mirror,
        pendingCanvasMutations,
        rafStamps,
        win,
      ),
    );
  }

  return () => {
    pendingCanvasMutations.clear();
    handlers.forEach((h) => h());
  };
}
