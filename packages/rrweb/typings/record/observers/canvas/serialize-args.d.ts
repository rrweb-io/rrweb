import { IWindow, SerializedWebGlArg } from '../../../types';
export declare function serializeArg(value: any, win: IWindow): SerializedWebGlArg;
export declare const serializeArgs: (args: Array<any>, win: IWindow) => SerializedWebGlArg[];
export declare const isInstanceOfWebGLObject: (value: any, win: IWindow) => value is WebGLShader | WebGLBuffer | WebGLVertexArrayObject | WebGLTexture | WebGLProgram | WebGLActiveInfo | WebGLUniformLocation | WebGLFramebuffer | WebGLRenderbuffer | WebGLShaderPrecisionFormat;
export declare const saveWebGLVar: (value: any, win: IWindow) => number | void;
