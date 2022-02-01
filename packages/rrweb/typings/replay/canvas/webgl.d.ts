import { Replayer } from '../';
import { CanvasContext, canvasMutationCommand, SerializedWebGlArg } from '../../types';
export declare function variableListFor(ctx: WebGLRenderingContext | WebGL2RenderingContext, ctor: string): any[];
export declare function deserializeArg(imageMap: Replayer['imageMap'], ctx: WebGLRenderingContext | WebGL2RenderingContext): (arg: SerializedWebGlArg) => any;
export default function webglMutation({ mutation, target, type, imageMap, errorHandler, }: {
    mutation: canvasMutationCommand;
    target: HTMLCanvasElement;
    type: CanvasContext;
    imageMap: Replayer['imageMap'];
    errorHandler: Replayer['warnCanvasMutationFailed'];
}): void;
