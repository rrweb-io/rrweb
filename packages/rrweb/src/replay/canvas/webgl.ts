import type { Replayer } from '../';
import { CanvasContext, type canvasMutationCommand } from '@saola.ai/rrweb-types';
import { deserializeArg, variableListFor } from './deserialize-args';

function getContext(
  target: HTMLCanvasElement,
  type: CanvasContext,
): WebGLRenderingContext | WebGL2RenderingContext | null {
  // Note to whomever is going to implement support for `contextAttributes`:
  // if `preserveDrawingBuffer` is set to true,
  // you might have to do `ctx.flush()` before every webgl canvas event
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

const WebGLVariableConstructorsNames = [
  'WebGLActiveInfo',
  'WebGLBuffer',
  'WebGLFramebuffer',
  'WebGLProgram',
  'WebGLRenderbuffer',
  'WebGLShader',
  'WebGLShaderPrecisionFormat',
  'WebGLTexture',
  'WebGLUniformLocation',
  'WebGLVertexArrayObject',
];

function saveToWebGLVarMap(
  ctx: WebGLRenderingContext | WebGL2RenderingContext,
  result: any,
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!result?.constructor) return; // probably null or undefined

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const { name } = result.constructor;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  if (!WebGLVariableConstructorsNames.includes(name)) return; // not a WebGL variable

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const variables = variableListFor(ctx, name);
  if (!variables.includes(result)) variables.push(result);
}

export default async function webglMutation({
  mutation,
  target,
  type,
  imageMap,
  errorHandler,
}: {
  mutation: canvasMutationCommand;
  target: HTMLCanvasElement;
  type: CanvasContext;
  imageMap: Replayer['imageMap'];
  errorHandler: Replayer['warnCanvasMutationFailed'];
}): Promise<void> {
  try {
    const ctx = getContext(target, type);
    if (!ctx) return;

    // NOTE: if `preserveDrawingBuffer` is set to true,
    // we must flush the buffers on every new canvas event
    // if (mutation.newFrame) ctx.flush();

    if (mutation.setter) {
      // skip some read-only type checks
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (ctx as any)[mutation.property] = mutation.args[0];
      return;
    }
    const original = ctx[
      mutation.property as Exclude<keyof typeof ctx, 'canvas'>
    ] as (
      ctx: WebGLRenderingContext | WebGL2RenderingContext,
      args: unknown[],
    ) => void;

    const args = await Promise.all(
      mutation.args.map(deserializeArg(imageMap, ctx)),
    );
    const result = original.apply(ctx, args);
    saveToWebGLVarMap(ctx, result);

    // Slows down replay considerably, only use for debugging
    const debugMode = false;
    if (debugMode) {
      if (mutation.property === 'compileShader') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (!ctx.getShaderParameter(args[0], ctx.COMPILE_STATUS))
          console.warn(
            'something went wrong in replay',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            ctx.getShaderInfoLog(args[0]),
          );
      } else if (mutation.property === 'linkProgram') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        ctx.validateProgram(args[0]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (!ctx.getProgramParameter(args[0], ctx.LINK_STATUS))
          console.warn(
            'something went wrong in replay',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          ...args,
        );
      }
    }
  } catch (error) {
    errorHandler(mutation, error);
  }
}
