import { INode } from 'rrweb-snapshot';
import {
  blockClass,
  CanvasContext,
  canvasMutationCallback,
  IWindow,
  listenerHandler,
  Mirror,
  SerializedWebGlArg,
} from '../../types';
import { hookSetter, isBlocked, patch } from '../../utils';

// from webgl-recorder: https://github.com/evanw/webgl-recorder/blob/bef0e65596e981ee382126587e2dcbe0fc7748e2/webgl-recorder.js#L50-L77
const webGLVars: Record<string, Array<any>> = {};
export function serializeArg(value: any): SerializedWebGlArg {

  if (value instanceof Array) {
    return value.map(serializeArg);
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
    value instanceof Int8Array
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
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [value.byteLength],
    };
  } else if (value instanceof DataView) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [serializeArg(value.buffer), value.byteOffset, value.byteLength],
    };
  } else if (
    value instanceof WebGLActiveInfo ||
    value instanceof WebGLBuffer ||
    value instanceof WebGLFramebuffer ||
    value instanceof WebGLProgram ||
    value instanceof WebGLRenderbuffer ||
    value instanceof WebGLShader ||
    value instanceof WebGLShaderPrecisionFormat ||
    value instanceof WebGLTexture ||
    value instanceof WebGLUniformLocation ||
    value instanceof WebGLVertexArrayObject ||
    // In Chrome, value won't be an instanceof WebGLVertexArrayObject.
    (value && value.constructor.name == 'WebGLVertexArrayObjectOES') ||
    typeof value === 'object'
  ) {
    const name = value.constructor.name;
    const list = webGLVars[name] || (webGLVars[name] = []);
    let index = list.indexOf(value);

    if (index === -1) {
      index = list.length;
      list.push(value);
    }

    return {
      rr_type: name,
      index,
    };
  }

  return value;
}

const serializeArgs = (args: Array<any>) => {
  return [...args].map(serializeArg);
};

export default function initCanvasWebGLMutationObserver(
  cb: canvasMutationCallback,
  win: IWindow,
  blockClass: blockClass,
  mirror: Mirror,
): listenerHandler {
  const handlers: listenerHandler[] = [];
  const props = Object.getOwnPropertyNames(win.WebGLRenderingContext.prototype);
  for (const prop of props) {
    try {
      if (
        typeof win.WebGLRenderingContext.prototype[
          prop as keyof WebGLRenderingContext
        ] !== 'function'
      ) {
        continue;
      }
      const restoreHandler = patch(
        win.WebGLRenderingContext.prototype,
        prop,
        function (original) {
          return function (
            this: WebGLRenderingContext,
            ...args: Array<unknown>
          ) {
            if (!isBlocked((this.canvas as unknown) as INode, blockClass)) {
              setTimeout(() => {
                const recordArgs = serializeArgs([...args]);
                cb({
                  id: mirror.getId((this.canvas as unknown) as INode),
                  type: CanvasContext.WebGL,
                  property: prop,
                  args: recordArgs,
                });
              }, 0);
            }
            return original.apply(this, args);
          };
        },
      );
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter<WebGLRenderingContext>(
        win.WebGLRenderingContext.prototype,
        prop,
        {
          set(v) {
            cb({
              id: mirror.getId((this.canvas as unknown) as INode),
              type: CanvasContext.WebGL,
              property: prop,
              args: [v],
              setter: true,
            });
          },
        },
      );
      handlers.push(hookHandler);
    }
  }
  return () => {
    handlers.forEach((h) => h());
  };
}
