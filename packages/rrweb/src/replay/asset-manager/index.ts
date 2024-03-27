import type {
  RebuildAssetManagerFinalStatus,
  RebuildAssetManagerInterface,
  RebuildAssetManagerStatus,
  assetEvent,
  captureAssetsParam,
} from '@rrweb/types';
import { deserializeArg } from '../canvas/deserialize-args';
import { getSourcesFromSrcset } from 'rrweb-snapshot';
import type { RRElement } from 'rrdom';
import { updateSrcset } from './update-srcset';

export default class AssetManager implements RebuildAssetManagerInterface {
  private originalToObjectURLMap: Map<string, string> = new Map();
  private nodeIdAttributeHijackedMap: Map<number, Map<string, string>> =
    new Map();
  private loadingURLs: Set<string> = new Set();
  private failedURLs: Set<string> = new Set();
  private callbackMap: Map<
    string,
    Array<(status: RebuildAssetManagerFinalStatus) => void>
  > = new Map();
  private liveMode: boolean;
  public allAdded: boolean;

  constructor({ liveMode }: { liveMode: boolean }) {
    this.liveMode = liveMode;
    this.allAdded = false;
  }

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

  // TODO: turn this into a true promise that throws if the asset fails to load
  public async whenReady(url: string): Promise<RebuildAssetManagerFinalStatus> {
    const currentStatus = this.get(url);
    if (
      currentStatus.status === 'loaded' ||
      currentStatus.status === 'failed'
    ) {
      return currentStatus;
    } else if (
      currentStatus.status === 'unknown' &&
      this.allAdded &&
      !this.liveMode
    ) {
      return {
        status: 'failed',
      };
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

  public async manageAttribute(
    node: RRElement | Element,
    nodeId: number,
    attribute: string,
    newValue: string,
  ): Promise<unknown> {
    const prevValue = node.getAttribute(attribute);

    const promises: Promise<unknown>[] = [];

    if (attribute === 'srcset') {
      const values = getSourcesFromSrcset(newValue);
      let expectedValue: string | null = prevValue;
      values.forEach((value) => {
        promises.push(
          this.whenReady(value).then((status) => {
            const isLoaded = status.status === 'loaded';
            if (!isLoaded) {
              if (!this.liveMode) {
                // failed to load asset, revert to recorded value
                node.setAttribute(attribute, newValue);
              }
              return; // failed to load asset
            }

            const attributeUnchanged =
              node.getAttribute(attribute) === expectedValue;

            if (!attributeUnchanged) return; // attribute was changed since we started loading the asset
            if (!expectedValue) {
              // before srcset has been set for the first time
              expectedValue = newValue;
            }
            expectedValue = updateSrcset(
              node,
              value,
              status.url,
              expectedValue,
            );
          }),
        );
      });
    } else {
      // In live mode we removes the attribute while it loads so it doesn't show the broken image icon
      if (this.liveMode && nodeId > 0) {
        let hijackedAttributes = this.nodeIdAttributeHijackedMap.get(nodeId);
        if (!hijackedAttributes) {
          hijackedAttributes = new Map();
          this.nodeIdAttributeHijackedMap.set(nodeId, hijackedAttributes);
        }
        hijackedAttributes.set(attribute, newValue);
        if (node.tagName === 'IMG' && attribute === 'src') {
          // special value to prevent a broken image icon while asset is being loaded
          node.setAttribute('src', '//:0');
        }
      }
      promises.push(
        this.whenReady(newValue).then((status) => {
          const isLoaded = status.status === 'loaded';
          if (!isLoaded) {
            if (!this.liveMode) {
              // failed to load asset, revert to recorded value
              node.setAttribute(attribute, newValue);
            }
            return;
          }

          const attributeUnchanged = this.liveMode
            ? newValue ===
              this.nodeIdAttributeHijackedMap.get(nodeId)?.get(attribute)
            : node.getAttribute(attribute) === prevValue;

          if (!attributeUnchanged) return; // attribute was changed since we started loading the asset

          node.setAttribute(attribute, status.url);
        }),
      );
    }

    return Promise.all(promises);
  }

  public reset(): void {
    this.originalToObjectURLMap.forEach((objectURL) => {
      URL.revokeObjectURL(objectURL);
    });
    this.originalToObjectURLMap.clear();
    this.loadingURLs.clear();
    this.failedURLs.clear();
    this.nodeIdAttributeHijackedMap.clear();
    this.callbackMap.forEach((callbacks) => {
      while (callbacks.length > 0) {
        const cb = callbacks.pop();
        if (cb) cb({ status: 'reset' });
      }
    });
    this.callbackMap.clear();
    this.allAdded = false;
  }
}
