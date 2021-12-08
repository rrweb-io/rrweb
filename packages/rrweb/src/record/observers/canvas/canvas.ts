import { INode } from 'rrweb-snapshot';
import { blockClass, IWindow, listenerHandler } from '../../../types';
import { isBlocked, patch } from '../../../utils';

// TODO: replace me for ICanvas from rrweb-snapshot
export type OgmentedCanvas = HTMLCanvasElement & { __context: string };

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
          this: OgmentedCanvas,
          contextType: string,
          ...args: Array<unknown>
        ) {
          if (!isBlocked((this as unknown) as INode, blockClass)) {
            if (!('__context' in this))
              (this as OgmentedCanvas).__context = contextType;
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
