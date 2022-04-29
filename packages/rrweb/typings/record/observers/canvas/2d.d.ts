import type { Mirror } from 'rrweb-snapshot';
import { blockClass, canvasManagerMutationCallback, IWindow, listenerHandler } from '../../../types';
export default function initCanvas2DMutationObserver(cb: canvasManagerMutationCallback, win: IWindow, blockClass: blockClass, mirror: Mirror): listenerHandler;
