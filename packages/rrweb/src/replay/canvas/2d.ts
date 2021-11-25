import { Replayer } from '../../../typings/entries/all';
import { canvasMutationData } from '../../types';

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
    const ctx = ((target as unknown) as HTMLCanvasElement).getContext('2d')!;

    if (mutation.setter) {
      // skip some read-only type checks
      // tslint:disable-next-line:no-any
      (ctx as any)[mutation.property] = mutation.args[0];
      return;
    }
    const original = ctx[
      mutation.property as Exclude<keyof typeof ctx, 'canvas'>
    ] as Function;

    /**
     * We have serialized the image source into base64 string during recording,
     * which has been preloaded before replay.
     * So we can get call drawImage SYNCHRONOUSLY which avoid some fragile cast.
     */
    if (
      mutation.property === 'drawImage' &&
      typeof mutation.args[0] === 'string'
    ) {
      const image = imageMap.get(event);
      mutation.args[0] = image;
      original.apply(ctx, mutation.args);
    } else {
      original.apply(ctx, mutation.args);
    }
  } catch (error) {
    errorHandler(mutation, error);
  }
}
