/**
 * @jest-environment jsdom
 */
import { polyfillWebGLGlobals } from '../utils';
polyfillWebGLGlobals();

import {
  CanvasArg,
  CanvasContext,
  EventType,
  IncrementalSource,
  eventWithTime,
} from '@amplitude/rrweb-types';
import { Replayer } from '../../src/replay';

let replayer: Replayer;

const canvasMutationEventWithArgs = (args: CanvasArg[]): eventWithTime => {
  return {
    timestamp: 100,
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.CanvasMutation,
      property: 'x',
      args,
      id: 1,
      type: CanvasContext.WebGL,
    },
  };
};

const event = (): eventWithTime => {
  return {
    timestamp: 1,
    type: EventType.DomContentLoaded,
    data: {},
  };
};

describe('preloadAllImages', () => {
  beforeEach(() => {
    replayer = new Replayer(
      // Get around the error "Replayer need at least 2 events."
      [event(), event()],
    );
  });

  it('should preload image', () => {
    replayer.service.state.context.events = [
      canvasMutationEventWithArgs([
        {
          rr_type: 'HTMLImageElement',
          src: 'http://example.com',
        },
      ]),
    ];

    (replayer as any).preloadAllImages();

    const expectedImage = new Image();
    expectedImage.src = 'http://example.com';
    expect((replayer as any).imageMap.get('http://example.com')).toEqual(
      expectedImage,
    );
  });

  it('should preload nested image', async () => {
    replayer.service.state.context.events = [
      canvasMutationEventWithArgs([
        {
          rr_type: 'Array',
          args: [
            {
              rr_type: 'HTMLImageElement',
              src: 'http://example.com',
            },
          ],
        },
      ]),
    ];

    await (replayer as any).preloadAllImages();

    const expectedImage = new Image();
    expectedImage.src = 'http://example.com';

    expect((replayer as any).imageMap.get('http://example.com')).toEqual(
      expectedImage,
    );
  });

  it('should preload multiple images', () => {
    replayer.service.state.context.events = [
      canvasMutationEventWithArgs([
        {
          rr_type: 'HTMLImageElement',
          src: 'http://example.com/img1.png',
        },
        {
          rr_type: 'HTMLImageElement',
          src: 'http://example.com/img2.png',
        },
      ]),
    ];

    (replayer as any).preloadAllImages();

    const expectedImage1 = new Image();
    expectedImage1.src = 'http://example.com/img1.png';

    expect(
      (replayer as any).imageMap.get('http://example.com/img1.png'),
    ).toEqual(expectedImage1);

    const expectedImage2 = new Image();
    expectedImage1.src = 'http://example.com/img2.png';

    expect(
      (replayer as any).imageMap.get('http://example.com/img2.png'),
    ).toEqual(expectedImage1);
  });
});
