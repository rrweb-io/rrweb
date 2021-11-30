/**
 * @jest-environment jsdom
 */

// polyfill as jsdom does not have support for these classes
// consider replacing with https://www.npmjs.com/package/canvas
class WebGLActiveInfo {
  constructor() {}
}

global.WebGLActiveInfo = WebGLActiveInfo as any;
class WebGLBuffer {
  constructor() {}
}

global.WebGLBuffer = WebGLBuffer as any;
class WebGLFramebuffer {
  constructor() {}
}

global.WebGLFramebuffer = WebGLFramebuffer as any;
class WebGLProgram {
  constructor() {}
}

global.WebGLProgram = WebGLProgram as any;
class WebGLRenderbuffer {
  constructor() {}
}

global.WebGLRenderbuffer = WebGLRenderbuffer as any;
class WebGLShader {
  constructor() {}
}

global.WebGLShader = WebGLShader as any;
class WebGLShaderPrecisionFormat {
  constructor() {}
}

global.WebGLShaderPrecisionFormat = WebGLShaderPrecisionFormat as any;
class WebGLTexture {
  constructor() {}
}

global.WebGLTexture = WebGLTexture as any;
class WebGLUniformLocation {
  constructor() {}
}

global.WebGLUniformLocation = WebGLUniformLocation as any;
class WebGLVertexArrayObject {
  constructor() {}
}

global.WebGLVertexArrayObject = WebGLVertexArrayObject as any;

import { deserializeArg } from '../../src/replay/canvas/webgl';

describe('deserializeArg', () => {
  it('should deserialize Float32Array values', async () => {
    expect(
      deserializeArg({
        rr_type: 'Float32Array',
        args: [[-1, -1, 3, -1, -1, 3]],
      }),
    ).toEqual(new Float32Array([-1, -1, 3, -1, -1, 3]));
  });

  it('should deserialize Float64Array values', async () => {
    expect(
      deserializeArg({
        rr_type: 'Float64Array',
        args: [[-1, -1, 3, -1, -1, 3]],
      }),
    ).toEqual(new Float64Array([-1, -1, 3, -1, -1, 3]));
  });

  it('should deserialize ArrayBuffer values', async () => {
    const contents = [1, 2, 0, 4];
    expect(
      deserializeArg({
        rr_type: 'ArrayBuffer',
        base64: 'AQIABA==',
      }),
    ).toStrictEqual(new Uint8Array(contents).buffer);
  });

  it('should deserialize DataView values', async () => {
    expect(
      deserializeArg({
        rr_type: 'DataView',
        args: [
          {
            rr_type: 'ArrayBuffer',
            base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
          },
          0,
          16,
        ],
      }),
    ).toStrictEqual(new DataView(new ArrayBuffer(16), 0, 16));
  });

  it('should leave arrays intact', async () => {
    const array = [1, 2, 3, 4];
    expect(deserializeArg(array)).toEqual(array);
  });

  it('should deserialize complex objects', async () => {
    const serializedArg = [
      {
        rr_type: 'DataView',
        args: [
          {
            rr_type: 'ArrayBuffer',
            args: [16],
          },
          0,
          16,
        ],
      },
      5,
      6,
    ];
    expect(deserializeArg(serializedArg)).toStrictEqual([
      new DataView(new ArrayBuffer(16), 0, 16),
      5,
      6,
    ]);
  });

  it('should leave null as-is', async () => {
    expect(deserializeArg(null)).toStrictEqual(null);
  });

  it('should support HTMLImageElements', async () => {
    const image = new Image();
    image.src = 'http://example.com/image.png';
    expect(
      deserializeArg({
        rr_type: 'HTMLImageElement',
        src: 'http://example.com/image.png',
      }),
    ).toStrictEqual(image);
  });
});
