import type { IWindow, CanvasArg } from '../../../types';
export declare function variableListFor(ctx: RenderingContext, ctor: string): unknown[];
export declare const saveWebGLVar: (value: unknown, win: IWindow, ctx: RenderingContext) => number | void;
export declare function serializeArg(value: unknown, win: IWindow, ctx: RenderingContext): CanvasArg;
export declare const serializeArgs: (args: Array<unknown>, win: IWindow, ctx: RenderingContext) => CanvasArg[];
export declare const isInstanceOfWebGLObject: (value: unknown, win: IWindow) => value is WebGLActiveInfo | WebGLBuffer | WebGLFramebuffer | WebGLProgram | WebGLRenderbuffer | WebGLShader | WebGLShaderPrecisionFormat | WebGLTexture | WebGLUniformLocation | WebGLVertexArrayObject;
