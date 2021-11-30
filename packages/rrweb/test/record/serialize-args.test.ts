/**
 * @jest-environment jsdom
 */
import { polyfillWebGLGlobals } from '../utils';
polyfillWebGLGlobals();

import { serializeArg } from '../../src/record/observers/canvas-web-gl';

describe('serializeArg', () => {
  it('should serialize Float32Array values', async () => {
    const float32Array = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const expected = {
      rr_type: 'Float32Array',
      args: [[-1, -1, 3, -1, -1, 3]],
    };
    expect(serializeArg(float32Array)).toEqual(expected);
  });

  it('should serialize Float64Array values', async () => {
    const float64Array = new Float64Array([-1, -1, 3, -1, -1, 3]);
    const expected = {
      rr_type: 'Float64Array',
      args: [[-1, -1, 3, -1, -1, 3]],
    };

    expect(serializeArg(float64Array)).toEqual(expected);
  });

  it('should serialize ArrayBuffer values', async () => {
    const arrayBuffer = new Uint8Array([1, 2, 0, 4]).buffer;
    const expected = {
      rr_type: 'ArrayBuffer',
      base64: 'AQIABA==',
    };

    expect(serializeArg(arrayBuffer)).toEqual(expected);
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

    expect(serializeArg(dataView)).toEqual(expected);
  });

  it('should leave arrays intact', async () => {
    const array = [1, 2, 3, 4];
    expect(serializeArg(array)).toEqual(array);
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

    expect(serializeArg(dataView)).toEqual(expected);
  });

  it('should serialize arraybuffer contents', async () => {
    const buffer = new Float32Array([1, 2, 3, 4]).buffer;
    const expected = {
      rr_type: 'ArrayBuffer',
      base64: 'AACAPwAAAEAAAEBAAACAQA==',
    };

    expect(serializeArg(buffer)).toEqual(expected);
  });

  it('should leave null as-is', async () => {
    expect(serializeArg(null)).toStrictEqual(null);
  });

  it('should support indexed variables', async () => {
    const webGLProgram = new WebGLProgram();
    expect(serializeArg(webGLProgram)).toEqual({
      rr_type: 'WebGLProgram',
      index: 0,
    });
  });
});
