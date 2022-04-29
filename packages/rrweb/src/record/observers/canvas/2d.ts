import type { Mirror } from 'rrweb-snapshot';
import {
  blockClass,
  CanvasContext,
  canvasManagerMutationCallback,
  IWindow,
  listenerHandler,
} from '../../../types';
import { hookSetter, isBlocked, patch } from '../../../utils';
import { serializeArgs } from './serialize-args';

export default function initCanvas2DMutationObserver(
  cb: canvasManagerMutationCallback,
  win: IWindow,
  blockClass: blockClass,
  mirror: Mirror,
): listenerHandler {
  const handlers: listenerHandler[] = [];
  const props2D = Object.getOwnPropertyNames(
    win.CanvasRenderingContext2D.prototype,
  );
  for (const prop of props2D) {
    try {
      if (
        typeof win.CanvasRenderingContext2D.prototype[
          prop as keyof CanvasRenderingContext2D
        ] !== 'function'
      ) {
        continue;
      }
      const restoreHandler = patch(
        win.CanvasRenderingContext2D.prototype,
        prop,
        function (original) {
          return function (
            this: CanvasRenderingContext2D,
            ...args: Array<unknown>
          ) {
            if (!isBlocked(this.canvas, blockClass)) {
              // Using setTimeout as toDataURL can be heavy
              // and we'd rather not block the main thread
              setTimeout(() => {
                const recordArgs = serializeArgs([...args], win, this);
                cb(this.canvas, {
                  type: CanvasContext['2D'],
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
      const hookHandler = hookSetter<CanvasRenderingContext2D>(
        win.CanvasRenderingContext2D.prototype,
        prop,
        {
          set(v) {
            cb(this.canvas, {
              type: CanvasContext['2D'],
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
