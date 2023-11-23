import type {
  RebuildAssetManagerFinalStatus,
  RebuildAssetManagerInterface,
  RebuildAssetManagerStatus,
  assetEvent,
} from '@rrweb/types';
import { deserializeArg } from '../canvas/deserialize-args';

export default class AssetManager implements RebuildAssetManagerInterface {
  private originalToObjectURLMap: Map<string, string> = new Map();
  private loadingURLs: Set<string> = new Set();
  private failedURLs: Set<string> = new Set();
  private callbackMap: Map<
    string,
    Array<(status: RebuildAssetManagerFinalStatus) => void>
  > = new Map();

  public async add(event: assetEvent) {
    const { data } = event;
    const { url, payload, failed } = { payload: false, failed: false, ...data };
    if (failed) {
      this.failedURLs.add(url);
      this.executeCallbacks(url, { status: 'failed' });
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
    this.executeCallbacks(url, { status: 'loaded', url: objectURL });
  }

  private executeCallbacks(
    url: string,
    status: RebuildAssetManagerFinalStatus,
  ) {
    const callbacks = this.callbackMap.get(url);
    while (callbacks && callbacks.length > 0) {
      const callback = callbacks.pop();
      if (!callback) {
        break;
      }
      callback(status);
    }
  }

  public async whenReady(url: string): Promise<RebuildAssetManagerFinalStatus> {
    const currentStatus = this.get(url);
    if (
      currentStatus.status === 'loaded' ||
      currentStatus.status === 'failed'
    ) {
      return currentStatus;
    }
    let resolve: (status: RebuildAssetManagerFinalStatus) => void;
    const promise = new Promise<RebuildAssetManagerFinalStatus>((r) => {
      resolve = r;
    });
    if (!this.callbackMap.has(url)) {
      this.callbackMap.set(url, []);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.callbackMap.get(url)!.push(resolve!);

    return promise;
  }

  public get(url: string): RebuildAssetManagerStatus {
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

  public reset(): void {
    this.originalToObjectURLMap.forEach((objectURL) => {
      URL.revokeObjectURL(objectURL);
    });
    this.originalToObjectURLMap.clear();
    this.loadingURLs.clear();
    this.failedURLs.clear();
    this.callbackMap.forEach((callbacks) => {
      while (callbacks.length > 0) {
        const cb = callbacks.pop();
        if (cb) cb({ status: 'reset' });
      }
    });
    this.callbackMap.clear();
  }
}
