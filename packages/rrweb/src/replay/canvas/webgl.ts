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

export function deserializeArg(arg: SerializedWebGlArg): any {
  if (arg && typeof arg === 'object' && 'rr_type' in arg) {
    if ('index' in arg) {
      const { rr_type: name, index } = arg;
      return variableListFor(name)[index];
    } else if ('args' in arg) {
      const { rr_type: name, args } = arg;

      // @ts-ignore
      const ctor = window[name] as unknown;

      // @ts-ignore
      return new ctor(...args.map(deserializeArg));
    } else if ('base64' in arg) {
      return decode(arg.base64);
    } else if ('src' in arg) {
      const image = new Image();
      image.src = arg.src;
      return image;
    }
  } else if (Array.isArray(arg)) {
    return arg.map(deserializeArg);
  }
  return arg;
}

export default function webglMutation({
  mutation,
  target,
  errorHandler,
}: {
  mutation: canvasMutationData;
  target: HTMLCanvasElement;
  errorHandler: Replayer['warnCanvasMutationFailed'];
}): void {
  try {
    const ctx = getContext(target, mutation.type);
    if (!ctx) return;

    if (mutation.newFrame) ctx.flush(); // flush to emulate the ending of the last request animation frame

    if (mutation.setter) {
      // skip some read-only type checks
      // tslint:disable-next-line:no-any
      (ctx as any)[mutation.property] = mutation.args[0];
      return;
    }
    const original = ctx[
      mutation.property as Exclude<keyof typeof ctx, 'canvas'>
    ] as Function;

    const args = mutation.args.map(deserializeArg);
    const result = original.apply(ctx, args);
    saveToWebGLVarMap(result);

    const debugMode = false;
    // const debugMode = true;
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
