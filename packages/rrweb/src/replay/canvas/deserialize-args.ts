import { decode } from 'base64-arraybuffer';
import type { Replayer } from '../';
import type { CanvasArg, SerializedCanvasArg } from '@saola.ai/rrweb-types';

// TODO: add ability to wipe this list
type GLVarMap = Map<string, any[]>;
const webGLVarMap: Map<
  CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext,
  GLVarMap
> = new Map();
export function variableListFor(
  ctx:
    | CanvasRenderingContext2D
    | WebGLRenderingContext
    | WebGL2RenderingContext,
  ctor: string,
) {
  let contextMap = webGLVarMap.get(ctx);
  if (!contextMap) {
    contextMap = new Map();
    webGLVarMap.set(ctx, contextMap);
  }
  if (!contextMap.has(ctor)) {
    contextMap.set(ctor, []);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return contextMap.get(ctor) as any[];
}

export function isSerializedArg(arg: unknown): arg is SerializedCanvasArg {
  return Boolean(arg && typeof arg === 'object' && 'rr_type' in arg);
}

export function deserializeArg(
  imageMap: Replayer['imageMap'],
  ctx:
    | CanvasRenderingContext2D
    | WebGLRenderingContext
    | WebGL2RenderingContext
    | null,
  preload?: {
    isUnchanged: boolean;
  },
): (arg: CanvasArg) => Promise<any> {
  return async (arg: CanvasArg): Promise<any> => {
    if (arg && typeof arg === 'object' && 'rr_type' in arg) {
      if (preload) preload.isUnchanged = false;
      if (arg.rr_type === 'ImageBitmap' && 'args' in arg) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const args = await deserializeArg(imageMap, ctx, preload)(arg.args);
        // eslint-disable-next-line prefer-spread
        return await createImageBitmap.apply(null, args);
      } else if ('index' in arg) {
        if (preload || ctx === null) return arg; // we are preloading, ctx is unknown
        const { rr_type: name, index } = arg;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return variableListFor(ctx, name)[index];
      } else if ('args' in arg) {
        const { rr_type: name, args } = arg;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const ctor = window[name as keyof Window];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return new ctor(
          ...(await Promise.all(
            args.map(deserializeArg(imageMap, ctx, preload)),
          )),
        );
      } else if ('base64' in arg) {
        return decode(arg.base64);
      } else if ('src' in arg) {
        const image = imageMap.get(arg.src);
        if (image) {
          return image;
        } else {
          const image = new Image();
          image.src = arg.src;
          imageMap.set(arg.src, image);
          return image;
        }
      } else if ('data' in arg && arg.rr_type === 'Blob') {
        const blobContents = await Promise.all(
          arg.data.map(deserializeArg(imageMap, ctx, preload)),
        );
        const blob = new Blob(blobContents, {
          type: arg.type,
        });
        return blob;
      }
    } else if (Array.isArray(arg)) {
      const result = await Promise.all(
        arg.map(deserializeArg(imageMap, ctx, preload)),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    }
    return arg;
  };
}
