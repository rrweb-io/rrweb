import { IWindow, CanvasArg } from '../../../types';
export declare function variableListFor(ctx: RenderingContext, ctor: string): any[];
export declare const saveWebGLVar: (value: any, win: IWindow, ctx: RenderingContext) => number | void;
export declare function serializeArg(value: any, win: IWindow, ctx: RenderingContext): CanvasArg;
export declare const serializeArgs: (args: Array<any>, win: IWindow, ctx: RenderingContext) => CanvasArg[];
export declare const isInstanceOfWebGLObject: (value: any, win: IWindow) => value is WebGLTexture | WebGLShader | WebGLBuffer | WebGLVertexArrayObject | WebGLProgram | WebGLActiveInfo | WebGLUniformLocation | WebGLFramebuffer | WebGLRenderbuffer | WebGLShaderPrecisionFormat;
