import { Replayer } from '../';
import { canvasMutationCommand, SerializedCanvasArg } from '../../types';
import { deserializeArg, isSerializedArg } from './deserialize-args';

const isDrawImageMutationWithImageBitmapArg = (
  mutation: canvasMutationCommand,
): mutation is canvasMutationCommand & {
  args: [SerializedCanvasArg];
} => {
  if (mutation.args.length !== 1) return false;
  const arg = mutation.args[0];
  return (
    mutation.property === 'drawImage' &&
    isSerializedArg(arg) &&
    arg.rr_type === 'ImageBitmap' &&
    'args' in arg
  );
};

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
    const ctx = ((target as unknown) as HTMLCanvasElement).getContext('2d')!;
    console.log('in 2d', ctx, mutation);

    if (mutation.setter) {
      // skip some read-only type checks
      // tslint:disable-next-line:no-any
      (ctx as any)[mutation.property] = mutation.args[0];
      return;
    }
    console.log('in 2d 2');
    const original = ctx[
      mutation.property as Exclude<keyof typeof ctx, 'canvas'>
    ] as Function;

    console.log('in 2d 3');
    /**
     * We have serialized the image source into base64 string during recording,
     * which has been preloaded before replay.
     * So we can get call drawImage SYNCHRONOUSLY which avoid some fragile cast.
     */
    if (
      mutation.property === 'drawImage' &&
      typeof mutation.args[0] === 'string'
    ) {
      console.log('in 2d 4a');
      const image = imageMap.get(event);
      mutation.args[0] = image;
      original.apply(ctx, mutation.args);
      // } else if (isDrawImageMutationWithImageBitmapArg(mutation)) {
      // console.log('in 2d 4b');
      // const imageBitmapArg = await Promise.all(
      //   mutation.args.map(deserializeArg(imageMap, ctx)),
      // );
      // console.log('arg', imageBitmapArg);
      // const imageBitmap = await createImageBitmap.apply(window, imageBitmapArg);
      // original.apply(ctx, [imageBitmap, 0, 0]);
      // } else
    } else {
      console.log('in 2d else');
      const args = await Promise.all(
        mutation.args.map(deserializeArg(imageMap, ctx)),
      );
      console.log('args', args);
      original.apply(ctx, args);
    }
  } catch (error) {
    errorHandler(mutation, error);
  }
}
