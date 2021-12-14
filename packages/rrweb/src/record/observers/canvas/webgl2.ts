import { INode } from 'rrweb-snapshot';
import {
  blockClass,
  CanvasContext,
  canvasMutationCallback,
  IWindow,
  listenerHandler,
  Mirror,
} from '../../../types';
import { hookSetter, isBlocked, patch } from '../../../utils';
import { saveWebGLVar, serializeArgs } from './serialize-args';

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
              setTimeout(() => {
                const recordArgs = serializeArgs([...args]);
                cb({
                  id: mirror.getId((this.canvas as unknown) as INode),
                  type: CanvasContext.WebGL2,
                  property: prop,
                  args: recordArgs,
                });
              }, 0);
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
