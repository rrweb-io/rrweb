import { encode } from 'base64-arraybuffer';
import type { IWindow, CanvasArg } from '@rrweb/types';

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

const inlinedImageCache = new Map<string, string>();
const ignoredCanvasMutationTargets = new WeakSet<HTMLCanvasElement>();
const objectTag = (value: unknown) => Object.prototype.toString.call(value);
const typedArrayTags: Record<string, true> = {
  '[object Float32Array]': true,
  '[object Float64Array]': true,
  '[object Int32Array]': true,
  '[object Uint32Array]': true,
  '[object Uint8Array]': true,
  '[object Uint16Array]': true,
  '[object Int16Array]': true,
  '[object Int8Array]': true,
  '[object Uint8ClampedArray]': true,
};

function hasTagName(value: unknown, tagName: string): boolean {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'tagName' in value &&
      value.tagName === tagName,
  );
}

function isHTMLImageElement(
  value: unknown,
  win: IWindow,
): value is HTMLImageElement {
  return Boolean(
    hasTagName(value, 'IMG') ||
      (typeof win.HTMLImageElement === 'function' &&
        value instanceof win.HTMLImageElement),
  );
}

function isHTMLCanvasElement(
  value: unknown,
  win: IWindow,
): value is HTMLCanvasElement {
  return Boolean(
    hasTagName(value, 'CANVAS') ||
      (typeof win.HTMLCanvasElement === 'function' &&
        value instanceof win.HTMLCanvasElement),
  );
}

function isImageData(value: unknown, win: IWindow): value is ImageData {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (objectTag(value) === '[object ImageData]' ||
        (typeof win.ImageData === 'function' &&
          value instanceof win.ImageData)),
  );
}

function inlineImageSrc(value: HTMLImageElement): string {
  const { src } = value;
  try {
    if (!value.complete || !value.naturalWidth) return src;
    if (typeof src !== 'string' || src.startsWith('data:')) return src;
    const cached = inlinedImageCache.get(src);
    if (cached) return cached;

    const canvas = (value.ownerDocument || document).createElement('canvas');
    ignoredCanvasMutationTargets.add(canvas);
    canvas.width = value.naturalWidth;
    canvas.height = value.naturalHeight;
    try {
      const context = canvas.getContext('2d');
      if (!context) return src;
      context.drawImage(value, 0, 0);
      const dataURL = canvas.toDataURL();
      if (inlinedImageCache.size > 100) inlinedImageCache.clear();
      inlinedImageCache.set(src, dataURL);
      return dataURL;
    } finally {
      ignoredCanvasMutationTargets.delete(canvas);
    }
  } catch {
    return src;
  }
}

export function isIgnoredCanvasMutationTarget(
  value: HTMLCanvasElement,
): boolean {
  return ignoredCanvasMutationTargets.has(value);
}

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
  } else if (typedArrayTags[objectTag(value)]) {
    const typedArray = value as {
      constructor: { name: string };
      length: number;
      [index: number]: number;
    };
    const name = typedArray.constructor.name;
    return {
      rr_type: name,
      args: [Array.from(typedArray)],
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
  } else if (isHTMLImageElement(value, win)) {
    const name = 'HTMLImageElement';
    const src = inlineImageSrc(value);
    return {
      rr_type: name,
      src,
    };
  } else if (isHTMLCanvasElement(value, win)) {
    const name = 'HTMLImageElement';
    // TODO: move `toDataURL` to web worker if possible
    const src = value.toDataURL(); // heavy on large canvas
    return {
      rr_type: name,
      src,
    };
  } else if (isImageData(value, win)) {
    const name = 'ImageData';
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
