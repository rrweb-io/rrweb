import { Replayer } from '../';
import { canvasMutationData, SerializedWebGlArg } from '../../types';
export declare function variableListFor(ctor: string): any[];
export declare function deserializeArg(arg: SerializedWebGlArg): any;
export default function webglMutation({ mutation, target, errorHandler, }: {
    mutation: canvasMutationData;
    target: HTMLCanvasElement;
    errorHandler: Replayer['warnCanvasMutationFailed'];
}): void;
