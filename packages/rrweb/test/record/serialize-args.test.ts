/**
 * @jest-environment jsdom
 */
import { polyfillWebGLGlobals } from '../utils';
polyfillWebGLGlobals();

import { serializeArg } from '../../src/record/observers/canvas/serialize-args';

describe('serializeArg', () => {
  it('should serialize Float32Array values', async () => {
    const float32Array = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const expected = {
      rr_type: 'Float32Array',
      args: [[-1, -1, 3, -1, -1, 3]],
    };
    expect(serializeArg(float32Array)).toStrictEqual(expected);
  });

  it('should serialize Float64Array values', async () => {
    const float64Array = new Float64Array([-1, -1, 3, -1, -1, 3]);
    const expected = {
      rr_type: 'Float64Array',
      args: [[-1, -1, 3, -1, -1, 3]],
    };

    expect(serializeArg(float64Array)).toStrictEqual(expected);
  });

  it('should serialize ArrayBuffer values', async () => {
    const arrayBuffer = new Uint8Array([1, 2, 0, 4]).buffer;
    const expected = {
      rr_type: 'ArrayBuffer',
      base64: 'AQIABA==',
    };

    expect(serializeArg(arrayBuffer)).toStrictEqual(expected);
  });

  it('should serialize Uint8Array values', async () => {
    const object = new Uint8Array([1, 2, 0, 4]);
    const expected = {
      rr_type: 'Uint8Array',
      args: [[1, 2, 0, 4]],
    };

    expect(serializeArg(object)).toStrictEqual(expected);
  });

  it('should serialize DataView values', async () => {
    const dataView = new DataView(new ArrayBuffer(16), 0, 16);
    const expected = {
      rr_type: 'DataView',
      args: [
        {
          rr_type: 'ArrayBuffer',
          base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
        },
        0,
        16,
      ],
    };

    expect(serializeArg(dataView)).toStrictEqual(expected);
  });

  it('should leave arrays intact', async () => {
    const array = [1, 2, 3, 4];
    expect(serializeArg(array)).toStrictEqual(array);
  });

  it('should serialize complex objects', async () => {
    const dataView = [new DataView(new ArrayBuffer(16), 0, 16), 5, 6];
    const expected = [
      {
        rr_type: 'DataView',
        args: [
          {
            rr_type: 'ArrayBuffer',
            base64: 'AAAAAAAAAAAAAAAAAAAAAA==',
          },
          0,
          16,
        ],
      },
      5,
      6,
    ];

    expect(serializeArg(dataView)).toStrictEqual(expected);
  });

  it('should serialize arraybuffer contents', async () => {
    const buffer = new Float32Array([1, 2, 3, 4]).buffer;
    const expected = {
      rr_type: 'ArrayBuffer',
      base64: 'AACAPwAAAEAAAEBAAACAQA==',
    };

    expect(serializeArg(buffer)).toStrictEqual(expected);
  });

  it('should leave null as-is', async () => {
    expect(serializeArg(null)).toStrictEqual(null);
  });

  it('should support indexed variables', async () => {
    const webGLProgram = new WebGLProgram();
    expect(serializeArg(webGLProgram)).toStrictEqual({
      rr_type: 'WebGLProgram',
      index: 0,
    });
  });

  it('should support HTMLImageElements', async () => {
    const image = new Image();
    image.src = 'http://example.com/image.png';
    expect(serializeArg(image)).toStrictEqual({
      rr_type: 'HTMLImageElement',
      src: 'http://example.com/image.png',
    });
  });
});
