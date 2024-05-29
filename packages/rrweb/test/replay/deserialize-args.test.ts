/**
 * @jest-environment jsdom
 */

import { deserializeArg } from '../../src/replay/canvas/deserialize-args';
import { polyfillWebGLGlobals } from '../utils';
polyfillWebGLGlobals();

let context: WebGLRenderingContext | WebGL2RenderingContext;
describe('deserializeArg', () => {
  beforeEach(() => {
    context = new WebGL2RenderingContext();
  });
  it('should deserialize Float32Array values', async () => {
    expect(
      await deserializeArg(
        new Map(),
        context,
      )({
        rr_type: 'Float32Array',
        args: [[-1, -1, 3, -1, -1, 3]],
      }),
    ).toEqual(new Float32Array([-1, -1, 3, -1, -1, 3]));
  });

  it('should deserialize Float64Array values', async () => {
    expect(
      await deserializeArg(
        new Map(),
        context,
      )({
        rr_type: 'Float64Array',
        args: [[-1, -1, 3, -1, -1, 3]],
      }),
    ).toEqual(new Float64Array([-1, -1, 3, -1, -1, 3]));
  });

  it('should deserialize ArrayBuffer values', async () => {
    const contents = [1, 2, 0, 4];
    expect(
      await deserializeArg(
        new Map(),
        context,
      )({
        rr_type: 'ArrayBuffer',
        base64: 'AQIABA==',
      }),
    ).toStrictEqual(new Uint8Array(contents).buffer);
  });

  it('should deserialize DataView values', async () => {
    expect(
      await deserializeArg(
        new Map(),
        context,
      )({
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
    expect(await deserializeArg(new Map(), context)(array)).toEqual(array);
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
    expect(
      await deserializeArg(new Map(), context)(serializedArg),
    ).toStrictEqual([new DataView(new ArrayBuffer(16), 0, 16), 5, 6]);
  });

  it('should leave null as-is', async () => {
    expect(await deserializeArg(new Map(), context)(null)).toStrictEqual(null);
  });

  it('should support HTMLImageElements', async () => {
    const image = new Image();
    image.src = 'http://example.com/image.png';
    expect(
      await deserializeArg(
        new Map(),
        context,
      )({
        rr_type: 'HTMLImageElement',
        src: 'http://example.com/image.png',
      }),
    ).toStrictEqual(image);
  });

  it('should return image from imageMap for HTMLImageElements', async () => {
    const image = new Image();
    image.src = 'http://example.com/image.png';
    const imageMap = new Map();
    imageMap.set(image.src, image);

    expect(
      await deserializeArg(
        imageMap,
        context,
      )({
        rr_type: 'HTMLImageElement',
        src: 'http://example.com/image.png',
      }),
    ).toBe(image);
  });

  it('should support blobs', async () => {
    const arrayBuffer = new Uint8Array([1, 2, 0, 4]).buffer;
    const expected = new Blob([arrayBuffer], { type: 'image/png' });

    const deserialized = await deserializeArg(
      new Map(),
      context,
    )({
      rr_type: 'Blob',
      data: [
        {
          rr_type: 'ArrayBuffer',
          base64: 'AQIABA==',
        },
      ],
      type: 'image/png',
    });

    // `expect(blob).toEqual(otherBlob)` doesn't really do anything yet
    // jest hasn't implemented a propper way to compare blobs
    // more info: https://github.com/facebook/jest/issues/7372
    // because JSDOM doesn't support most functions needed for comparison:
    // more info: https://github.com/jsdom/jsdom/issues/2555
    expect(deserialized).toEqual(expected);
    // thats why we test size of the blob as well
    expect((deserialized as Blob)?.size).toEqual(expected.size);
  });

  describe('isUnchanged', () => {
    it('should set isUnchanged:true when non of the args are changed', async () => {
      const status = {
        isUnchanged: true,
      };

      await deserializeArg(new Map(), context, status)(true);
      expect(status.isUnchanged).toBeTruthy();
    });

    it('should set isUnchanged: false when args are deserialzed', async () => {
      const status = {
        isUnchanged: true,
      };

      await deserializeArg(
        new Map(),
        context,
        status,
      )({
        rr_type: 'Float64Array',
        args: [[-1, -1, 3, -1, -1, 3]],
      });
      expect(status.isUnchanged).toBeFalsy();
    });

    it('should set isUnchanged: false when nested args are deserialzed', async () => {
      const status = {
        isUnchanged: true,
      };

      await deserializeArg(
        new Map(),
        context,
        status,
      )([
        {
          rr_type: 'Float64Array',
          args: [[-1, -1, 3, -1, -1, 3]],
        },
      ]);
      expect(status.isUnchanged).toBeFalsy();
    });
  });
});
