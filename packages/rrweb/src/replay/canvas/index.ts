import { Replayer } from '..';
import {
  CanvasContext,
  canvasMutationCommand,
  canvasMutationData,
} from '../../types';
import webglMutation from './webgl';
import canvas2DMutation from './2d';

export default async function canvasMutation({
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
}): Promise<void> {
  try {
    const mutations: canvasMutationCommand[] =
      'commands' in mutation ? mutation.commands : [mutation];

    if ([CanvasContext.WebGL, CanvasContext.WebGL2].includes(mutation.type)) {
      for (let i = 0; i < mutations.length; i++) {
        const command = mutations[i];
        await webglMutation({
          mutation: command,
          type: mutation.type,
          target,
          imageMap,
          errorHandler,
        });
      }
      return;
    }
    // default is '2d' for backwards compatibility (rrweb below 1.1.x)
    for (let i = 0; i < mutations.length; i++) {
      const command = mutations[i];
      await canvas2DMutation({
        event,
        mutation: command,
        target,
        imageMap,
        errorHandler,
      });
    }
  } catch (error) {
    errorHandler(mutation, error);
  }
}
