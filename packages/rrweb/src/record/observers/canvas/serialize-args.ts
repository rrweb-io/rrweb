import { encode } from 'base64-arraybuffer';
import type { IWindow, CanvasArg } from '@saola.ai/rrweb-types';

// TODO: unify with `replay/webgl.ts`
type CanvasVarMap = Map<string, unknown[]>;
const canvasVarMap: Map<RenderingContext, CanvasVarMap> = new Map();
export function variableListFor(ctx: RenderingContext, ctor: string) {
  let contextMap = canvasVarMap.get(ctx);
  if (!contextMap) {
    contextMap = new Map();
    canvasVarMap.set(ctx, contextMap);
  }
  if (!contextMap.has(ctor)) {
    contextMap.set(ctor, []);
  }
  return contextMap.get(ctor) as unknown[];
}

export const saveWebGLVar = (
  value: unknown,
  win: IWindow,
  ctx: RenderingContext,
): number | void => {
  if (
    !value ||
    !(isInstanceOfWebGLObject(value, win) || typeof value === 'object')
  )
    return;

  const name = value.constructor.name;
  const list = variableListFor(ctx, name);
  let index = list.indexOf(value);

  if (index === -1) {
    index = list.length;
    list.push(value);
  }
  return index;
};

// from webgl-recorder: https://github.com/evanw/webgl-recorder/blob/bef0e65596e981ee382126587e2dcbe0fc7748e2/webgl-recorder.js#L50-L77
export function serializeArg(
  value: unknown,
  win: IWindow,
  ctx: RenderingContext,
): CanvasArg {
  if (value instanceof Array) {
    return value.map((arg) => serializeArg(arg, win, ctx));
  } else if (value === null) {
    return value;
  } else if (
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof Int32Array ||
    value instanceof Uint32Array ||
    value instanceof Uint8Array ||
    value instanceof Uint16Array ||
    value instanceof Int16Array ||
    value instanceof Int8Array ||
    value instanceof Uint8ClampedArray
  ) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [Object.values(value)],
    };
  } else if (
    // SharedArrayBuffer disabled on most browsers due to spectre.
    // More info: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer/SharedArrayBuffer
    // value instanceof SharedArrayBuffer ||
    value instanceof ArrayBuffer
  ) {
    const name = value.constructor.name as 'ArrayBuffer';
    const base64 = encode(value);

    return {
      rr_type: name,
      base64,
    };
  } else if (value instanceof DataView) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [
        serializeArg(value.buffer, win, ctx),
        value.byteOffset,
        value.byteLength,
      ],
    };
  } else if (value instanceof HTMLImageElement) {
    const name = value.constructor.name;
    const { src } = value;
    return {
      rr_type: name,
      src,
    };
  } else if (value instanceof HTMLCanvasElement) {
    const name = 'HTMLImageElement';
    // TODO: move `toDataURL` to web worker if possible
    const src = value.toDataURL(); // heavy on large canvas
    return {
      rr_type: name,
      src,
    };
  } else if (value instanceof ImageData) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [serializeArg(value.data, win, ctx), value.width, value.height],
    };
    // } else if (value instanceof Blob) {
    //   const name = value.constructor.name;
    //   return {
    //     rr_type: name,
    //     data: [serializeArg(await value.arrayBuffer(), win, ctx)],
    //     type: value.type,
    //   };
  } else if (isInstanceOfWebGLObject(value, win) || typeof value === 'object') {
    const name = value.constructor.name;
    const index = saveWebGLVar(value, win, ctx) as number;

    return {
      rr_type: name,
      index: index,
    };
  }

  return value as unknown as CanvasArg;
}

export const serializeArgs = (
  args: Array<unknown>,
  win: IWindow,
  ctx: RenderingContext,
) => {
  return args.map((arg) => serializeArg(arg, win, ctx));
};

export const isInstanceOfWebGLObject = (
  value: unknown,
  win: IWindow,
): value is
  | WebGLActiveInfo
  | WebGLBuffer
  | WebGLFramebuffer
  | WebGLProgram
  | WebGLRenderbuffer
  | WebGLShader
  | WebGLShaderPrecisionFormat
  | WebGLTexture
  | WebGLUniformLocation
  | WebGLVertexArrayObject => {
  const webGLConstructorNames: string[] = [
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
    // In old Chrome versions, value won't be an instanceof WebGLVertexArrayObject.
    'WebGLVertexArrayObjectOES',
  ];
  const supportedWebGLConstructorNames = webGLConstructorNames.filter(
    (name: string) => typeof win[name as keyof Window] === 'function',
  );
  return Boolean(
    supportedWebGLConstructorNames.find(
      (name: string) => value instanceof win[name as keyof Window],
    ),
  );
};
