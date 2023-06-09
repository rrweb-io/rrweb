import type {
  IWindow,
  SerializedCanvasArg,
  eventWithTime,
  listenerHandler,
} from '@rrweb/types';
import type { assetCallback } from '@rrweb/types';
import { encode } from 'base64-arraybuffer';

import { patch } from '../../utils';
import type { recordOptions } from '../../types';

export default class AssetManager {
  private urlObjectMap = new Map<string, File | Blob | MediaSource>();
  private capturedURLs = new Set<string>();
  private capturingURLs = new Set<string>();
  private failedURLs = new Set<string>();
  private resetHandlers: listenerHandler[] = [];
  private mutationCb: assetCallback;
  public readonly config: Exclude<
    recordOptions<eventWithTime>['assetCapture'],
    undefined
  >;

  public reset() {
    this.urlObjectMap.clear();
    this.capturedURLs.clear();
    this.capturingURLs.clear();
    this.failedURLs.clear();
    this.resetHandlers.forEach((h) => h());
  }

  constructor(options: {
    mutationCb: assetCallback;
    win: IWindow;
    assetCapture: Exclude<
      recordOptions<eventWithTime>['assetCapture'],
      undefined
    >;
  }) {
    const { win } = options;

    this.mutationCb = options.mutationCb;
    this.config = options.assetCapture;

    const urlObjectMap = this.urlObjectMap;

    if (this.config.captureObjectURLs) {
      try {
        const restoreHandler = patch(
          win.URL,
          'createObjectURL',
          function (original: (obj: File | Blob | MediaSource) => string) {
            return function (obj: File | Blob | MediaSource) {
              const url = original.apply(this, [obj]);
              urlObjectMap.set(url, obj);
              return url;
            };
          },
        );
        this.resetHandlers.push(restoreHandler);
      } catch {
        console.error('failed to patch URL.createObjectURL');
      }

      try {
        const restoreHandler = patch(
          win.URL,
          'revokeObjectURL',
          function (original: (objectURL: string) => void) {
            return function (objectURL: string) {
              urlObjectMap.delete(objectURL);
              return original.apply(this, [objectURL]);
            };
          },
        );
        this.resetHandlers.push(restoreHandler);
      } catch {
        console.error('failed to patch URL.revokeObjectURL');
      }
    }
  }

  public shouldIgnore(url: string): boolean {
    const originsToIgnore = ['data:'];
    const urlIsBlob = url.startsWith(`blob:${window.location.origin}/`);

    // Check if url is a blob and we should ignore blobs
    if (urlIsBlob) return !this.config.captureObjectURLs;

    // Check if url matches any ignorable origins
    for (const origin of originsToIgnore) {
      if (url.startsWith(origin)) return true;
    }

    // Check the captureOrigins
    const captureOrigins = this.config.captureOrigins;
    if (typeof captureOrigins === 'boolean') {
      return !captureOrigins;
    } else if (Array.isArray(captureOrigins)) {
      const urlOrigin = new URL(url).origin;
      return !captureOrigins.includes(urlOrigin);
    }

    return false;
  }

  public async getURLObject(
    url: string,
  ): Promise<File | Blob | MediaSource | null> {
    const object = this.urlObjectMap.get(url);
    if (object) {
      return object;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      console.log('getURLObject', url, blob);
      return blob;
    } catch (e) {
      console.warn(`getURLObject failed for ${url}`);
      throw e;
    }
  }

  public capture(url: string): {
    status: 'capturing' | 'captured' | 'error' | 'refused';
  } {
    console.log('capture', url, this.shouldIgnore(url));
    if (this.shouldIgnore(url)) return { status: 'refused' };

    if (this.capturedURLs.has(url)) {
      return { status: 'captured' };
    } else if (this.capturingURLs.has(url)) {
      return { status: 'capturing' };
    } else if (this.failedURLs.has(url)) {
      return { status: 'error' };
    }
    this.capturingURLs.add(url);
    console.log('capturing');
    void this.getURLObject(url)
      .then(async (object) => {
        console.log('captured', url);
        if (object) {
          let payload: SerializedCanvasArg;
          if (object instanceof File || object instanceof Blob) {
            const arrayBuffer = await object.arrayBuffer();
            const base64 = encode(arrayBuffer); // cpu intensive, probably good idea to move all of this to a webworker

            payload = {
              rr_type: 'Blob',
              type: object.type,
              data: [
                {
                  rr_type: 'ArrayBuffer',
                  base64, // base64
                },
              ],
            };

            this.capturedURLs.add(url);
            this.capturingURLs.delete(url);

            this.mutationCb({
              url,
              payload,
            });
          }
        }
      })
      .catch(() => {
        // TODO: add mutationCb for failed urls
        this.failedURLs.add(url);
        this.capturingURLs.delete(url);
      });

    return { status: 'capturing' };
  }
}
