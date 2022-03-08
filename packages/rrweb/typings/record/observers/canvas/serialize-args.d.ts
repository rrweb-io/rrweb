import { IWindow, SerializedWebGlArg } from '../../../types';
export declare function variableListFor(ctx: WebGLRenderingContext | WebGL2RenderingContext, ctor: string): any[];
export declare const saveWebGLVar: (value: any, win: IWindow, ctx: WebGL2RenderingContext | WebGLRenderingContext) => number | void;
export declare function serializeArg(value: any, win: IWindow, ctx: WebGL2RenderingContext | WebGLRenderingContext): SerializedWebGlArg;
export declare const serializeArgs: (args: Array<any>, win: IWindow, ctx: WebGLRenderingContext | WebGL2RenderingContext) => SerializedWebGlArg[];
export declare const isInstanceOfWebGLObject: (value: any, win: IWindow) => value is WebGLTexture | WebGLShader | WebGLBuffer | WebGLVertexArrayObject | WebGLProgram | WebGLActiveInfo | WebGLUniformLocation | WebGLFramebuffer | WebGLRenderbuffer | WebGLShaderPrecisionFormat;
