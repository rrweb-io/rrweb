import { Replayer } from '../../../typings/entries/all';
import { CanvasContext, canvasMutationData } from '../../types';

const webGLVarMap: Map<string, any[]> = new Map();
function variableListFor(ctor: string) {
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


    if (mutation.setter) {
      // skip some read-only type checks
      // tslint:disable-next-line:no-any
      (ctx as any)[mutation.property] = mutation.args[0];
      return;
    }
    const original = ctx[
      mutation.property as Exclude<keyof typeof ctx, 'canvas'>
    ] as Function;

    const args = mutation.args.map((arg: any) => {
      if (typeof arg === 'string') {
        if (arg.startsWith('$')) {
          const [name, index] = arg.slice(1).split('#');
          return variableListFor(name)[Number(index)];
        }
        return arg;
      }
    });
    const result = original.apply(ctx, args);

    saveToWebGLVarMap(result);
  } catch (error) {
    errorHandler(mutation, error);
  }
}
