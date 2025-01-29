import {
  type blockClass,
  CanvasContext,
  type canvasManagerMutationCallback,
  type canvasMutationWithType,
  type IWindow,
  type listenerHandler,
} from '@saola.ai/rrweb-types';
import { hookSetter, isBlocked, patch } from '../../../utils';
import { saveWebGLVar, serializeArgs } from './serialize-args';

function patchGLPrototype(
  prototype: WebGLRenderingContext | WebGL2RenderingContext,
  type: CanvasContext,
  cb: canvasManagerMutationCallback,
  blockClass: blockClass,
  blockSelector: string | null,
  win: IWindow,
): listenerHandler[] {
  const handlers: listenerHandler[] = [];

  const props = Object.getOwnPropertyNames(prototype);

  for (const prop of props) {
    if (
      //prop.startsWith('get') ||  // e.g. getProgramParameter, but too risky
      [
        'isContextLost',
        'canvas',
        'drawingBufferWidth',
        'drawingBufferHeight',
      ].includes(prop)
    ) {
      // skip read only propery/functions
      continue;
    }
    try {
      if (typeof prototype[prop as keyof typeof prototype] !== 'function') {
        continue;
      }
      const restoreHandler = patch(
        prototype,
        prop,
        function (
          original: (this: typeof prototype, ...args: Array<unknown>) => void,
        ) {
          return function (this: typeof prototype, ...args: Array<unknown>) {
            const result = original.apply(this, args);
            saveWebGLVar(result, win, this);
            if (
              'tagName' in this.canvas &&
              !isBlocked(this.canvas, blockClass, blockSelector, true)
            ) {
              const recordArgs = serializeArgs(args, win, this);
              const mutation: canvasMutationWithType = {
                type,
                property: prop,
                args: recordArgs,
              };
              // TODO: this could potentially also be an OffscreenCanvas as well as HTMLCanvasElement
              cb(this.canvas, mutation);
            }

            return result;
          };
        },
      );
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter<typeof prototype>(prototype, prop, {
        set(v) {
          // TODO: this could potentially also be an OffscreenCanvas as well as HTMLCanvasElement
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
  blockSelector: string | null,
): listenerHandler {
  const handlers: listenerHandler[] = [];

  handlers.push(
    ...patchGLPrototype(
      win.WebGLRenderingContext.prototype,
      CanvasContext.WebGL,
      cb,
      blockClass,
      blockSelector,
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
        blockSelector,
        win,
      ),
    );
  }

  return () => {
    handlers.forEach((h) => h());
  };
}
