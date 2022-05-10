import { Replayer } from '..';
import { canvasMutationData } from '../../types';
export default function canvasMutation({ event, mutation, target, imageMap, canvasEventMap, errorHandler, }: {
    event: Parameters<Replayer['applyIncremental']>[0];
    mutation: canvasMutationData;
    target: HTMLCanvasElement;
    imageMap: Replayer['imageMap'];
    canvasEventMap: Replayer['canvasEventMap'];
    errorHandler: Replayer['warnCanvasMutationFailed'];
}): Promise<void>;
