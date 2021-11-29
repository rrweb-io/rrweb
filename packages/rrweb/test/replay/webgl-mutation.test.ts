/**
 * @jest-environment jsdom
 */

import webglMutation, { variableListFor } from '../../src/replay/canvas/webgl';
import { CanvasContext, IncrementalSource } from '../../src/types';
import { polyfillWebGLGlobals } from '../utils';

polyfillWebGLGlobals();

let canvas: HTMLCanvasElement;
describe('webglMutation', () => {
  beforeEach(() => {
    canvas = document.createElement('canvas');
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create webgl variables', async () => {
    const createShaderMock = jest.fn().mockImplementation(() => {
      return new WebGLShader();
    });
    jest.spyOn(canvas, 'getContext').mockImplementation(() => {
      return ({
        createShader: createShaderMock,
      } as unknown) as WebGLRenderingContext;
    });

    expect(variableListFor('WebGLShader')).toHaveLength(0);

    webglMutation({
      mutation: {
        source: IncrementalSource.CanvasMutation,
        type: CanvasContext.WebGL,
        id: 1,
        property: 'createShader',
        args: [35633],
      },
      target: canvas,
      errorHandler: () => {},
    });

    expect(createShaderMock).toHaveBeenCalledWith(35633);
    expect(variableListFor('WebGLShader')).toHaveLength(1);
  });
});
