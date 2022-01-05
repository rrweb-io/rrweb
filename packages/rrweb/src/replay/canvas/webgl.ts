import { decode } from 'base64-arraybuffer';
import { Replayer } from '../';
import {
  CanvasContext,
  canvasMutationData,
  SerializedWebGlArg,
} from '../../types';

// TODO: add ability to wipe this list
const webGLVarMap: Map<string, any[]> = new Map();
export function variableListFor(ctor: string) {
  if (!webGLVarMap.has(ctor)) {
    webGLVarMap.set(ctor, []);
  }
  return webGLVarMap.get(ctor) as any[];
}

function getContext(
  target: HTMLCanvasElement,
  type: CanvasContext,
): WebGLRenderingContext | WebGL2RenderingContext | null {
  // Note to whomever is going to implement support for `contextAttributes`:
  // if `preserveDrawingBuffer` is set to true,
  // you have to do `ctx.flush()` before every `newFrame: true`
  try {
    if (type === CanvasContext.WebGL) {
      return (
        target.getContext('webgl')! || target.getContext('experimental-webgl')
      );
    }
    return target.getContext('webgl2')!;
  } catch (e) {
    return null;
  }
}

const WebGLVariableConstructors = [
  WebGLActiveInfo,
  WebGLBuffer,
  WebGLFramebuffer,
  WebGLProgram,
  WebGLRenderbuffer,
  WebGLShader,
  WebGLShaderPrecisionFormat,
  WebGLTexture,
  WebGLUniformLocation,
  WebGLVertexArrayObject,
];
const WebGLVariableConstructorsNames = WebGLVariableConstructors.map(
  (ctor) => ctor.name,
);

function saveToWebGLVarMap(result: any) {
  if (!result?.constructor) return; // probably null or undefined

  const { name } = result.constructor;
  if (!WebGLVariableConstructorsNames.includes(name)) return; // not a WebGL variable

  const variables = variableListFor(name);
  if (!variables.includes(result)) variables.push(result);
}

export function deserializeArg(
  imageMap: Replayer['imageMap'],
): (arg: SerializedWebGlArg) => any {
  return (arg: SerializedWebGlArg): any => {
    if (arg && typeof arg === 'object' && 'rr_type' in arg) {
      if ('index' in arg) {
        const { rr_type: name, index } = arg;
        return variableListFor(name)[index];
      } else if ('args' in arg) {
        const { rr_type: name, args } = arg;
        const ctor = window[name as keyof Window];

        return new ctor(...args.map(deserializeArg(imageMap)));
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
      }
    } else if (Array.isArray(arg)) {
      return arg.map(deserializeArg(imageMap));
    }
    return arg;
  };
}

export default function webglMutation({
  mutation,
  target,
  imageMap,
  errorHandler,
}: {
  mutation: canvasMutationData;
  target: HTMLCanvasElement;
  imageMap: Replayer['imageMap'];
  errorHandler: Replayer['warnCanvasMutationFailed'];
}): void {
  try {
    const ctx = getContext(target, mutation.type);
    if (!ctx) return;

    // NOTE: if `preserveDrawingBuffer` is set to true,
    // we must flush the buffers on every newFrame: true
    // if (mutation.newFrame) ctx.flush();

    if (mutation.setter) {
      // skip some read-only type checks
      // tslint:disable-next-line:no-any
      (ctx as any)[mutation.property] = mutation.args[0];
      return;
    }
    const original = ctx[
      mutation.property as Exclude<keyof typeof ctx, 'canvas'>
    ] as Function;

    const args = mutation.args.map(deserializeArg(imageMap));
    const result = original.apply(ctx, args);
    saveToWebGLVarMap(result);

    // Slows down replay considerably, only use for debugging
    const debugMode = false;
    if (debugMode) {
      if (mutation.property === 'compileShader') {
        if (!ctx.getShaderParameter(args[0], ctx.COMPILE_STATUS))
          console.warn(
            'something went wrong in replay',
            ctx.getShaderInfoLog(args[0]),
          );
      } else if (mutation.property === 'linkProgram') {
        ctx.validateProgram(args[0]);
        if (!ctx.getProgramParameter(args[0], ctx.LINK_STATUS))
          console.warn(
            'something went wrong in replay',
            ctx.getProgramInfoLog(args[0]),
          );
      }
      const webglError = ctx.getError();
      if (webglError !== ctx.NO_ERROR) {
        console.warn(
          'WEBGL ERROR',
          webglError,
          'on command:',
          mutation.property,
          ...args,
        );
      }
    }
  } catch (error) {
    errorHandler(mutation, error);
  }
}
