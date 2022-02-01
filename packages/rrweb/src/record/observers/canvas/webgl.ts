import { INode } from 'rrweb-snapshot';
import {
  blockClass,
  CanvasContext,
  canvasManagerMutationCallback,
  canvasMutationWithType,
  IWindow,
  listenerHandler,
  Mirror,
} from '../../../types';
import { hookSetter, isBlocked, patch } from '../../../utils';
import { saveWebGLVar, serializeArgs } from './serialize-args';

function patchGLPrototype(
  prototype: WebGLRenderingContext | WebGL2RenderingContext,
  type: CanvasContext,
  cb: canvasManagerMutationCallback,
  blockClass: blockClass,
  mirror: Mirror,
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
            // TODO: this could potentially also be an OffscreenCanvas as well as HTMLCanvasElement
            cb(this.canvas as HTMLCanvasElement, mutation);
          }

          return result;
        };
      });
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter<typeof prototype>(prototype, prop, {
        set(v) {
          // TODO: this could potentially also be an OffscreenCanvas as well as HTMLCanvasElement
          cb(this.canvas as HTMLCanvasElement, {
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
  cb: canvasManagerMutationCallback,
  win: IWindow,
  blockClass: blockClass,
  mirror: Mirror,
): listenerHandler {
  const handlers: listenerHandler[] = [];

  handlers.push(
    ...patchGLPrototype(
      win.WebGLRenderingContext.prototype,
      CanvasContext.WebGL,
      cb,
      blockClass,
      mirror,
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
        win,
      ),
    );
  }

  return () => {
    handlers.forEach((h) => h());
  };
}
