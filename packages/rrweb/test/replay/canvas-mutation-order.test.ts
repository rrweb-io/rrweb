/**
 * @vitest-environment jsdom
 */
import { vi } from 'vitest';
import { polyfillWebGLGlobals } from '../utils';
polyfillWebGLGlobals();

import { CanvasContext, IncrementalSource } from '@rrweb/types';
import canvasMutation from '../../src/replay/canvas';
import type { Replayer } from '../../src/replay';

type CanvasEvent = Parameters<Replayer['applyIncremental']>[0];

const frame = (label: string) =>
  ({
    source: IncrementalSource.CanvasMutation,
    id: 1,
    type: CanvasContext['2D'],
    commands: [
      {
        property: 'drawImage',
        args: [{ rr_type: 'ImageBitmap', args: [label] }, 0, 0],
      },
    ],
  }) as const;

describe('canvasMutation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Each mutation decodes its arguments asynchronously before drawing. When a
   * seek applies many frames of one canvas at once, a frame that decodes slowly
   * must not be drawn after the frames recorded later, or the canvas ends up
   * showing a stale frame.
   */
  it('applies mutations of one canvas in the order they were replayed', async () => {
    const drawn: unknown[] = [];
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockImplementation(
      () =>
        ({
          drawImage: (image: unknown) => drawn.push(image),
        }) as unknown as CanvasRenderingContext2D,
    );
    const decodeTime: Record<string, number> = { first: 1000, second: 10 };
    (global as any).createImageBitmap = (label: string) =>
      new Promise((resolve) =>
        setTimeout(() => resolve(label), decodeTime[label]),
      );

    const apply = (label: string) =>
      canvasMutation({
        event: {} as CanvasEvent,
        mutation: frame(label) as unknown as CanvasEvent['data'] & {
          source: IncrementalSource.CanvasMutation;
        },
        target: canvas,
        imageMap: new Map(),
        canvasEventMap: new Map(),
        errorHandler: (_, error) => {
          throw error;
        },
      });

    const done = Promise.all([apply('first'), apply('second')]);
    await vi.advanceTimersByTimeAsync(2000);
    await done;

    expect(drawn).toEqual(['first', 'second']);
  });
});
