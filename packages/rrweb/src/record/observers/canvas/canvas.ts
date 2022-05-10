import { ICanvas } from 'rrweb-snapshot';
import { blockClass, IWindow, listenerHandler } from '../../../types';
import { isBlocked, patch } from '../../../utils';

export default function initCanvasContextObserver(
  win: IWindow,
  blockClass: blockClass,
): listenerHandler {
  const handlers: listenerHandler[] = [];
  try {
    const restoreHandler = patch(
      win.HTMLCanvasElement.prototype,
      'getContext',
      function (original) {
        return function (
          this: ICanvas,
          contextType: string,
          ...args: Array<unknown>
        ) {
          if (!isBlocked(this, blockClass)) {
            if (!('__context' in this))
              (this as ICanvas).__context = contextType;
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
