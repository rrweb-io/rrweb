/**
 * @jest-environment jsdom
 */

import AssetManager from '../../src/replay/assets';
import { EventType, SerializedBlobArg, assetEvent } from '@rrweb/types';

describe('AssetManager', () => {
  let assetManager: AssetManager;
  let useURLPolyfill = false;
  const examplePayload: SerializedBlobArg = {
    rr_type: 'Blob',
    type: 'image/png',
    data: [
      {
        rr_type: 'ArrayBuffer',
        base64: 'fake-base64-abcd',
      },
    ],
  };

  beforeAll(() => {
    // https://github.com/jsdom/jsdom/issues/1721
    if (typeof window.URL.createObjectURL === 'undefined') {
      useURLPolyfill = true;
      window.URL.createObjectURL = () => '';
    }
  });

  beforeEach(() => {
    assetManager = new AssetManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (useURLPolyfill) {
      delete (window.URL as any).createObjectURL;
    }
  });

  it('should add an asset to the manager', async () => {
    const url = 'https://example.com/image.png';

    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    const createObjectURLSpy = jest
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('objectURL');

    await assetManager.add(event);

    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(assetManager.get(url)).toEqual({
      status: 'loaded',
      url: 'objectURL',
    });
  });

  it('should not add a failed asset to the manager', async () => {
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: { url, failed: { message: 'failed to load file' } },
    };
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL');

    await assetManager.add(event);

    expect(createObjectURLSpy).not.toHaveBeenCalled();
    expect(assetManager.get(url)).toEqual({ status: 'failed' });
  });

  it('should return the correct status for a loading asset', () => {
    const url = 'https://example.com/image.png';
    const event: assetEvent = {
      type: EventType.Asset,
      data: {
        url,
        payload: examplePayload,
      },
    };
    void assetManager.add(event);

    expect(assetManager.get(url)).toEqual({ status: 'loading' });
  });

  it('should return the correct status for an unknown asset', () => {
    const url = 'https://example.com/image.png';

    expect(assetManager.get(url)).toEqual({ status: 'unknown' });
  });
});
