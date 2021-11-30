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

export default function initCanvas2DMutationObserver(
  cb: canvasMutationCallback,
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
            if (!isBlocked((this.canvas as unknown) as INode, blockClass)) {
              setTimeout(() => {
                const recordArgs = [...args];
                if (prop === 'drawImage') {
                  if (
                    recordArgs[0] &&
                    recordArgs[0] instanceof HTMLCanvasElement
                  ) {
                    const canvas = recordArgs[0];
                    const ctx = canvas.getContext('2d');
                    let imgd = ctx?.getImageData(
                      0,
                      0,
                      canvas.width,
                      canvas.height,
                    );
                    let pix = imgd?.data;
                    recordArgs[0] = JSON.stringify(pix);
                  }
                }
                cb({
                  id: mirror.getId((this.canvas as unknown) as INode),
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
            cb({
              id: mirror.getId((this.canvas as unknown) as INode),
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
