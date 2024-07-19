import type { ICanvas } from 'rrweb-snapshot';
import type { IWindow, listenerHandler } from '@rrweb/types';
import { isBlocked, patch } from '../../../utils';

function getNormalizedContextName(contextType: string) {
  return contextType === 'experimental-webgl' ? 'webgl' : contextType;
}

export default function initCanvasContextObserver(
  win: IWindow,
  blockSelector: string | RegExp | null,
  setPreserveDrawingBufferToTrue: boolean,
): listenerHandler {
  const handlers: listenerHandler[] = [];
  try {
    const restoreHandler = patch(
      win.HTMLCanvasElement.prototype,
      'getContext',
      function (
        original: (
          this: ICanvas | HTMLCanvasElement,
          contextType: string,
          ...args: Array<unknown>
        ) => void,
      ) {
        return function (
          this: ICanvas | HTMLCanvasElement,
          contextType: string,
          ...args: Array<unknown>
        ) {
          if (!isBlocked(this, blockSelector, true)) {
            const ctxName = getNormalizedContextName(contextType);
            if (!('__context' in this)) (this as ICanvas).__context = ctxName;

            if (
              setPreserveDrawingBufferToTrue &&
              ['webgl', 'webgl2'].includes(ctxName)
            ) {
              if (args[0] && typeof args[0] === 'object') {
                const contextAttributes = args[0] as WebGLContextAttributes;
                if (!contextAttributes.preserveDrawingBuffer) {
                  contextAttributes.preserveDrawingBuffer = true;
                }
              } else {
                args.splice(0, 1, {
                  preserveDrawingBuffer: true,
                });
              }
            }
          }
          return original.apply(this, [contextType, ...args]);
        };
      },
    );
    handlers.push(restoreHandler);
  } catch {
    console.error('failed to patch HTMLCanvasElement.prototype.getContext');
  }
  return () => {
    handlers.forEach((h) => h());
  };
}
