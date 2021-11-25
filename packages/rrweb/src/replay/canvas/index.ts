import { Replayer } from '..';
import { CanvasContext, canvasMutationData } from '../../types';
import webglMutation from './webgl';
import canvas2DMutation from './2d';

export default function canvasMutation({
  event,
  mutation,
  target,
  imageMap,
  errorHandler,
}: {
  event: Parameters<Replayer['applyIncremental']>[0];
  mutation: canvasMutationData;
  target: HTMLCanvasElement;
  imageMap: Replayer['imageMap'];
  errorHandler: Replayer['warnCanvasMutationFailed'];
}): void {
  try {
    if ([CanvasContext.WebGL, CanvasContext.WebGL2].includes(mutation.type)) {
      return webglMutation({ mutation, target, errorHandler });
    }
    // default is '2d' for backwards compatibility (rrweb below 1.1.x)
    return canvas2DMutation({
      event,
      mutation,
      target,
      imageMap,
      errorHandler,
    });
  } catch (error) {
    errorHandler(mutation, error);
  }
}
