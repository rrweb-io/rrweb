import { SerializedWebGlArg } from '../../../types';
export declare function serializeArg(value: any): SerializedWebGlArg;
export declare const serializeArgs: (args: Array<any>) => SerializedWebGlArg[];
export declare const saveWebGLVar: (value: any) => number | void;
