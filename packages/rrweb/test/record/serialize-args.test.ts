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
    expect(serializeArg(float32Array, window)).toStrictEqual(expected);
  });

  it('should serialize Float64Array values', async () => {
    const float64Array = new Float64Array([-1, -1, 3, -1, -1, 3]);
    const expected = {
      rr_type: 'Float64Array',
      args: [[-1, -1, 3, -1, -1, 3]],
    };

    expect(serializeArg(float64Array, window)).toStrictEqual(expected);
  });

  it('should serialize ArrayBuffer values', async () => {
    const arrayBuffer = new Uint8Array([1, 2, 0, 4]).buffer;
    const expected = {
      rr_type: 'ArrayBuffer',
      base64: 'AQIABA==',
    };

    expect(serializeArg(arrayBuffer, window)).toStrictEqual(expected);
  });

  it('should serialize Uint8Array values', async () => {
    const object = new Uint8Array([1, 2, 0, 4]);
    const expected = {
      rr_type: 'Uint8Array',
      args: [[1, 2, 0, 4]],
    };

    expect(serializeArg(object, window)).toStrictEqual(expected);
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

    expect(serializeArg(dataView, window)).toStrictEqual(expected);
  });

  it('should leave arrays intact', async () => {
    const array = [1, 2, 3, 4];
    expect(serializeArg(array, window)).toStrictEqual(array);
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

    expect(serializeArg(dataView, window)).toStrictEqual(expected);
  });

  it('should serialize arraybuffer contents', async () => {
    const buffer = new Float32Array([1, 2, 3, 4]).buffer;
    const expected = {
      rr_type: 'ArrayBuffer',
      base64: 'AACAPwAAAEAAAEBAAACAQA==',
    };

    expect(serializeArg(buffer, window)).toStrictEqual(expected);
  });

  it('should leave null as-is', async () => {
    expect(serializeArg(null, window)).toStrictEqual(null);
  });

  it('should support indexed variables', async () => {
    const webGLProgram = new WebGLProgram();
    expect(serializeArg(webGLProgram, window)).toStrictEqual({
      rr_type: 'WebGLProgram',
      index: 0,
    });
  });

  it('should support HTMLImageElements', async () => {
    const image = new Image();
    image.src = 'http://example.com/image.png';
    expect(serializeArg(image, window)).toStrictEqual({
      rr_type: 'HTMLImageElement',
      src: 'http://example.com/image.png',
    });
  });

  it('should serialize ImageData', async () => {
    const arr = new Uint8ClampedArray(40000);

    // Iterate through every pixel
    for (let i = 0; i < arr.length; i += 4) {
      arr[i + 0] = 0; // R value
      arr[i + 1] = 190; // G value
      arr[i + 2] = 0; // B value
      arr[i + 3] = 255; // A value
    }

    // Initialize a new ImageData object
    let imageData = new ImageData(arr, 200, 50);

    const contents = Array.from(arr);
    expect(serializeArg(imageData, window)).toStrictEqual({
      rr_type: 'ImageData',
      args: [
        {
          rr_type: 'Uint8ClampedArray',
          args: [contents],
        },
        200,
        50,
      ],
    });
  });
});
