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

const pendingCanvasMutations = new Map<
  HTMLCanvasElement,
  canvasMutationParam[]
>();

// FIXME: total hack here, we need to find a better way to do this
function flushPendingCanvasMutations(
  cb: canvasMutationCallback,
  mirror: Mirror,
) {
  pendingCanvasMutations.forEach(
    (values: canvasMutationParam[], canvas: HTMLCanvasElement) => {
      const id = mirror.getId((canvas as unknown) as INode);
      flushPendingCanvasMutationFor(canvas, id, cb);
    },
  );
  requestAnimationFrame(() => flushPendingCanvasMutations(cb, mirror));
}

function flushPendingCanvasMutationFor(
  canvas: HTMLCanvasElement,
  id: number,
  cb: canvasMutationCallback,
) {
  const values = pendingCanvasMutations.get(canvas);
  if (!values || id === -1) return;

  values.forEach((p) => cb({ ...p, id }));
  pendingCanvasMutations.delete(canvas);
}

export default function initCanvasWebGLMutationObserver(
  cb: canvasMutationCallback,
  win: IWindow,
  blockClass: blockClass,
  mirror: Mirror,
): listenerHandler {
  const handlers: listenerHandler[] = [];
  const props = Object.getOwnPropertyNames(
    win.WebGL2RenderingContext.prototype,
  );

  // TODO: replace me
  requestAnimationFrame(() => flushPendingCanvasMutations(cb, mirror));

  for (const prop of props) {
    try {
      if (
        typeof win.WebGL2RenderingContext.prototype[
          prop as keyof WebGL2RenderingContext
        ] !== 'function'
      ) {
        continue;
      }
      const restoreHandler = patch(
        win.WebGL2RenderingContext.prototype,
        prop,
        function (original) {
          return function (
            this: WebGL2RenderingContext,
            ...args: Array<unknown>
          ) {
            const result = original.apply(this, args);
            saveWebGLVar(result);
            if (!isBlocked((this.canvas as unknown) as INode, blockClass)) {
              const id = mirror.getId((this.canvas as unknown) as INode);

              const recordArgs = serializeArgs([...args]);
              const mutation = {
                id,
                type: CanvasContext.WebGL2,
                property: prop,
                args: recordArgs,
              };

              if (id === -1) {
                if (!pendingCanvasMutations.has(this.canvas))
                  pendingCanvasMutations.set(this.canvas, []);

                pendingCanvasMutations
                  .get(this.canvas as HTMLCanvasElement)!
                  .push(mutation);
              } else {
                // flush all pending mutations
                flushPendingCanvasMutationFor(this.canvas, id, cb);
                cb(mutation);
              }
            }

            return result;
          };
        },
      );
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter<WebGL2RenderingContext>(
        win.WebGL2RenderingContext.prototype,
        prop,
        {
          set(v) {
            cb({
              id: mirror.getId((this.canvas as unknown) as INode),
              type: CanvasContext.WebGL2,
              property: prop,
              args: [v],
              setter: true,
            });
          },
        },
      );
      handlers.push(hookHandler);
    }
  }
  return () => {
    handlers.forEach((h) => h());
  };
}
