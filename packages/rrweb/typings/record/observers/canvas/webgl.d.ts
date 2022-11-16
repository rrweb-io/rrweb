import { Mirror } from '@fullview/rrweb-snapshot';
import { canvasManagerMutationCallback, IWindow, listenerHandler } from '../../../types';
export default function initCanvasWebGLMutationObserver(cb: canvasManagerMutationCallback, win: IWindow, blockSelector: string | undefined, mirror: Mirror): listenerHandler;
