import type { Replayer } from '../';
import type { CanvasArg, SerializedCanvasArg } from '../../types';
export declare function variableListFor(ctx: CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext, ctor: string): any[];
export declare function isSerializedArg(arg: unknown): arg is SerializedCanvasArg;
export declare function deserializeArg(imageMap: Replayer['imageMap'], ctx: CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext | null, preload?: {
    isUnchanged: boolean;
}): (arg: CanvasArg) => Promise<any>;
