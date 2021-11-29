import { Replayer } from '..';
import { canvasMutationData } from '../../types';
export default function canvasMutation({ event, mutation, target, imageMap, errorHandler, }: {
    event: Parameters<Replayer['applyIncremental']>[0];
    mutation: canvasMutationData;
    target: HTMLCanvasElement;
    imageMap: Replayer['imageMap'];
    errorHandler: Replayer['warnCanvasMutationFailed'];
}): void;
