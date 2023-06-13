import type { RebuildAssetManagerInterface, assetEvent } from '@rrweb/types';
import { deserializeArg } from '../canvas/deserialize-args';

export default class AssetManager implements RebuildAssetManagerInterface {
  private originalToObjectURLMap: Map<string, string> = new Map();
  private loadingURLs: Set<string> = new Set();
  private failedURLs: Set<string> = new Set();

  public async add(event: assetEvent) {
    const { data } = event;
    const { url, payload, failed } = { payload: false, failed: false, ...data };
    if (failed) {
      this.failedURLs.add(url);
      return;
    }
    this.loadingURLs.add(url);

    // tracks if deserializing did anything, not really needed for AssetManager
    const status = {
      isUnchanged: true,
    };

    // TODO: extract the logic only needed for assets from deserializeArg
    const result = (await deserializeArg(new Map(), null, status)(payload)) as
      | Blob
      | MediaSource;

    const objectURL = URL.createObjectURL(result);
    this.originalToObjectURLMap.set(url, objectURL);
    this.loadingURLs.delete(url);
  }

  public get(
    url: string,
  ):
    | { status: 'loading' }
    | { status: 'loaded'; url: string }
    | { status: 'failed' }
    | { status: 'unknown' } {
    const result = this.originalToObjectURLMap.get(url);

    if (result) {
      return {
        status: 'loaded',
        url: result,
      };
    }

    if (this.loadingURLs.has(url)) {
      return {
        status: 'loading',
      };
    }

    if (this.failedURLs.has(url)) {
      return {
        status: 'failed',
      };
    }

    return {
      status: 'unknown',
    };
  }
}
