import { Replayer } from '../';
import { canvasMutationCommand } from '../../types';
import { deserializeArg } from './deserialize-args';

export default async function canvasMutation({
  event,
  mutation,
  target,
  imageMap,
  errorHandler,
}: {
  event: Parameters<Replayer['applyIncremental']>[0];
  mutation: canvasMutationCommand;
  target: HTMLCanvasElement;
  imageMap: Replayer['imageMap'];
  errorHandler: Replayer['warnCanvasMutationFailed'];
}): Promise<void> {
  try {
    const ctx = target.getContext('2d')!;

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
      original.apply(ctx, mutation.args);
    } else {
      const args = await Promise.all(
        mutation.args.map(deserializeArg(imageMap, ctx)),
      );
      original.apply(ctx, args);
    }
  } catch (error) {
    errorHandler(mutation, error);
  }
}
