import { INode } from 'rrweb-snapshot';
import {
  blockClass,
  CanvasContext,
  canvasMutationCallback,
  IWindow,
  listenerHandler,
  Mirror,
  SerializedWebGlArg,
} from '../../../types';
import { hookSetter, isBlocked, patch } from '../../../utils';
import { serializeArgs } from './serialize-args';

export default function initCanvasWebGLMutationObserver(
  cb: canvasMutationCallback,
  win: IWindow,
  blockClass: blockClass,
  mirror: Mirror,
): listenerHandler {
  const handlers: listenerHandler[] = [];
  const props = Object.getOwnPropertyNames(win.WebGLRenderingContext.prototype);
  for (const prop of props) {
    try {
      if (
        typeof win.WebGLRenderingContext.prototype[
          prop as keyof WebGLRenderingContext
        ] !== 'function'
      ) {
        continue;
      }
      const restoreHandler = patch(
        win.WebGLRenderingContext.prototype,
        prop,
        function (original) {
          return function (
            this: WebGLRenderingContext,
            ...args: Array<unknown>
          ) {
            if (!isBlocked((this.canvas as unknown) as INode, blockClass)) {
              setTimeout(() => {
                const recordArgs = serializeArgs([...args]);
                cb({
                  id: mirror.getId((this.canvas as unknown) as INode),
                  type: CanvasContext.WebGL,
                  property: prop,
                  args: recordArgs,
                });
              }, 0);
            }
            return original.apply(this, args);
          };
        },
      );
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter<WebGLRenderingContext>(
        win.WebGLRenderingContext.prototype,
        prop,
        {
          set(v) {
            cb({
              id: mirror.getId((this.canvas as unknown) as INode),
              type: CanvasContext.WebGL,
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
