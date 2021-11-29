import { blockClass, canvasMutationCallback, IWindow, listenerHandler, Mirror, SerializedWebGlArg } from '../../types';
export declare function serializeArg(value: any): SerializedWebGlArg;
export default function initCanvasWebGLMutationObserver(cb: canvasMutationCallback, win: IWindow, blockClass: blockClass, mirror: Mirror): listenerHandler;
