/**
 * @jest-environment jsdom
 */

import { polyfillWebGLGlobals } from '../utils';
polyfillWebGLGlobals();

import canvas2DMutation from '../../src/replay/canvas/2d';
import type { Replayer } from '../../src/replay';

let canvas: HTMLCanvasElement;
describe('canvas2DMutation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    canvas = document.createElement('canvas');
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should execute all mutations after args are parsed', async () => {
    let resolve: (value: unknown) => void;
    const promise = new Promise((r) => {
      resolve = r;
    });
    const context = {
      clearRect: jest.fn(),
      drawImage: jest.fn(),
    } as unknown as CanvasRenderingContext2D;
    jest.spyOn(canvas, 'getContext').mockImplementation(() => {
      return context;
    });

    const createImageBitmapMock = jest.fn(() => {
      return new Promise((r) => {
        setTimeout(r, 1000);
      });
    });

    (global as any).createImageBitmap = createImageBitmapMock;

    const mutation = canvas2DMutation({
      event: {} as Parameters<Replayer['applyIncremental']>[0],
      mutations: [
        {
          property: 'clearRect',
          args: [0, 0, 1000, 1000],
        },
        {
          property: 'drawImage',
          args: [
            {
              rr_type: 'ImageBitmap',
              args: [],
            },
            0,
            0,
          ],
        },
      ],
      target: canvas,
      imageMap: new Map(),
      errorHandler: () => {},
    });

    await jest.advanceTimersByTimeAsync(100);

    await expect(createImageBitmapMock).toHaveBeenCalled();

    expect(context.clearRect).not.toBeCalled();
    expect(context.drawImage).not.toBeCalled();

    await jest.advanceTimersByTimeAsync(1000);

    await mutation;

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 1000, 1000);
    expect(context.drawImage).toHaveBeenCalled();
  });
});
