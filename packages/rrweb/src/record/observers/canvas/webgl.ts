import { INode } from 'rrweb-snapshot';
import {
  blockClass,
  CanvasContext,
  canvasMutationCallback,
  canvasMutationParam,
  IWindow,
  listenerHandler,
  Mirror,
} from '../../../types';
import { hookSetter, isBlocked, patch } from '../../../utils';
import { saveWebGLVar, serializeArgs } from './serialize-args';

type pendingCanvasMutationsMap = Map<HTMLCanvasElement, canvasMutationParam[]>;

// FIXME: total hack here, we need to find a better way to do this
function flushPendingCanvasMutations(
  pendingCanvasMutations: pendingCanvasMutationsMap,
  cb: canvasMutationCallback,
  mirror: Mirror,
) {
  pendingCanvasMutations.forEach(
    (values: canvasMutationParam[], canvas: HTMLCanvasElement) => {
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
  const values = pendingCanvasMutations.get(canvas);
  if (!values || id === -1) return;

  values.forEach((p) => cb({ ...p, id }));
  pendingCanvasMutations.delete(canvas);
}

function patchGLPrototype(
  prototype: WebGLRenderingContext | WebGL2RenderingContext,
  type: CanvasContext,
  cb: canvasMutationCallback,
  blockClass: blockClass,
  mirror: Mirror,
  pendingCanvasMutations: pendingCanvasMutationsMap,
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
          const result = original.apply(this, args);
          saveWebGLVar(result);
          if (!isBlocked((this.canvas as unknown) as INode, blockClass)) {
            const id = mirror.getId((this.canvas as unknown) as INode);

            const recordArgs = serializeArgs([...args]);
            const mutation = {
              id,
              type,
              property: prop,
              args: recordArgs,
            };

            if (id === -1) {
              // FIXME! THIS COULD MAYBE BE AN OFFSCREEN CANVAS
              if (
                !pendingCanvasMutations.has(this.canvas as HTMLCanvasElement)
              ) {
                pendingCanvasMutations.set(
                  this.canvas as HTMLCanvasElement,
                  [],
                );
              }

              pendingCanvasMutations
                .get(this.canvas as HTMLCanvasElement)!
                .push(mutation);
            } else {
              // flush all pending mutations
              flushPendingCanvasMutationFor(
                this.canvas as HTMLCanvasElement,
                pendingCanvasMutations,
                id,
                cb,
              );
              cb(mutation);
            }
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
      ),
    );
  }

  return () => {
    pendingCanvasMutations.clear();
    handlers.forEach((h) => h());
  };
}
