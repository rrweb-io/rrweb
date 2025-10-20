import {
  type blockClass,
  type canvasManagerMutationCallback,
  type IWindow,
  type listenerHandler,
} from '@newrelic/rrweb-types';
export default function initCanvas2DMutationObserver(
  cb: canvasManagerMutationCallback,
  win: IWindow,
  blockClass: blockClass,
  blockSelector: string | null,
): listenerHandler;
