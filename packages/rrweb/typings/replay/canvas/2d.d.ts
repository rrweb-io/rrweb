import type { Replayer } from '../';
import type { canvasMutationCommand } from '../../types';
export default function canvasMutation({ event, mutation, target, imageMap, errorHandler, }: {
    event: Parameters<Replayer['applyIncremental']>[0];
    mutation: canvasMutationCommand;
    target: HTMLCanvasElement;
    imageMap: Replayer['imageMap'];
    errorHandler: Replayer['warnCanvasMutationFailed'];
}): Promise<void>;
