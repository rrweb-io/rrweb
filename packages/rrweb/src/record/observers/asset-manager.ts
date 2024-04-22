import type {
  IWindow,
  SerializedCanvasArg,
  eventWithTime,
  listenerHandler,
  asset,
} from '@rrweb/types';
import type { assetCallback } from '@rrweb/types';
import { encode } from 'base64-arraybuffer';

import { patch } from '../../utils';

import type { recordOptions, assetStatus } from '../../types';
import {
  isAttributeCapturable,
  getSourcesFromSrcset,
  shouldIgnoreAsset,
} from 'rrweb-snapshot';

export default class AssetManager {
  private urlObjectMap = new Map<string, File | Blob | MediaSource>();
  private capturedURLs = new Set<string>();
  private capturingURLs = new Set<string>();
  private failedURLs = new Set<string>();
  private resetHandlers: listenerHandler[] = [];
  private mutationCb: assetCallback;
  public readonly config: Exclude<
    recordOptions<eventWithTime>['captureAssets'],
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
    captureAssets: Exclude<
      recordOptions<eventWithTime>['captureAssets'],
      undefined
    >;
  }) {
    const { win } = options;

    this.mutationCb = options.mutationCb;
    this.config = options.captureAssets;

    const urlObjectMap = this.urlObjectMap;

    if (this.config.objectURLs) {
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
    return shouldIgnoreAsset(url, this.config);
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
      return blob;
    } catch (e) {
      console.warn(`getURLObject failed for ${url}`);
      throw e;
    }
  }

  public capture(asset: asset): assetStatus | assetStatus[] {
    if (asset.attr === 'srcset') {
      const statuses: assetStatus[] = [];
      getSourcesFromSrcset(asset.value).forEach((url) => {
        statuses.push(this.captureUrl(url));
      });
      return statuses;
    } else {
      return this.captureUrl(asset.value);
    }
  }

  public captureUrl(url: string): assetStatus {
    if (this.shouldIgnore(url)) {
      console.warn(`snapshot.ts should know to ignore ${url}`);
      return { status: 'refused' };
    }

    if (this.capturedURLs.has(url)) {
      return { status: 'captured' };
    } else if (this.capturingURLs.has(url)) {
      return { status: 'capturing' };
    } else if (this.failedURLs.has(url)) {
      return { status: 'error' };
    }
    this.capturingURLs.add(url);
    void this.getURLObject(url)
      .then(async (object) => {
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
      .catch((e: unknown) => {
        let message = '';
        if (e instanceof Error) {
          message = e.message;
        } else if (typeof e === 'string') {
          message = e;
        } else if (e && typeof e === 'object' && 'toString' in e) {
          message = (e as { toString(): string }).toString();
        }
        this.mutationCb({
          url,
          failed: {
            message,
          },
        });

        this.failedURLs.add(url);
        this.capturingURLs.delete(url);
      });

    return { status: 'capturing' };
  }

  public isAttributeCapturable(n: Element, attribute: string): boolean {
    return isAttributeCapturable(n, attribute);
  }
}
