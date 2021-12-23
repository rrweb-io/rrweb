import { Replayer } from '../';
import { canvasMutationData, SerializedWebGlArg } from '../../types';
export declare function variableListFor(ctor: string): any[];
export declare function deserializeArg(imageMap: Replayer['imageMap']): (arg: SerializedWebGlArg) => any;
export default function webglMutation({ mutation, target, imageMap, errorHandler, }: {
    mutation: canvasMutationData;
    target: HTMLCanvasElement;
    imageMap: Replayer['imageMap'];
    errorHandler: Replayer['warnCanvasMutationFailed'];
}): void;
