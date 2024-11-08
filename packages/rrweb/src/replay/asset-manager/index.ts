import type {
  RebuildAssetManagerFinalStatus,
  RebuildAssetManagerInterface,
  RebuildAssetManagerStatus,
  assetEvent,
  SerializedCssTextArg,
  SerializedCanvasArg,
  serializedElementNodeWithId,
} from '@rrweb/types';
import { deserializeArg } from '../canvas/deserialize-args';
import {
  getSourcesFromSrcset,
  buildStyleNode,
  type BuildCache,
} from 'rrweb-snapshot';
import type { RRElement } from 'rrdom';
import { updateSrcset } from './update-srcset';

export default class AssetManager implements RebuildAssetManagerInterface {
  private originalToObjectURLMap: Map<string, Map<number, string>> = new Map();
  private urlToStylesheetMap: Map<string, Map<number, string[]>> = new Map();
  private nodeIdAttributeHijackedMap: Map<number, Map<string, string>> =
    new Map();
  private loadingURLs: Set<string> = new Set();
  private failedURLs: Set<string> = new Set();
  private callbackMap: Map<
    string,
    Array<(status: RebuildAssetManagerFinalStatus) => void>
  > = new Map();
  private liveMode: boolean;
  private cache: BuildCache;
  public allAdded: boolean;
  public replayerApproxTs: number = 0;

  constructor({ liveMode, cache }: { liveMode: boolean; cache: BuildCache }) {
    this.liveMode = liveMode;
    this.cache = cache;
    this.allAdded = false;
  }

  public async add(event: assetEvent & { timestamp: number }) {
    const { data } = event;
    const { url, payload, failed } = { payload: false, failed: false, ...data };
    if (failed) {
      this.failedURLs.add(url);
      this.executeCallbacks(url, { status: 'failed' });
      return;
    }
    if (this.loadingURLs.has(url)) {
      return;
    }
    this.loadingURLs.add(url);

    // tracks if deserializing did anything, not really needed for AssetManager
    const status = {
      isUnchanged: true,
    };

    if (payload.rr_type === 'CssText') {
      const cssPayload = payload as SerializedCssTextArg;
      let assets = this.urlToStylesheetMap.get(url);
      if (!assets) {
        assets = new Map();
        this.urlToStylesheetMap.set(url, assets);
      }
      assets.set(event.timestamp, cssPayload.cssTexts);
      this.loadingURLs.delete(url);
      this.failedURLs.delete(url);
      this.executeCallbacks(url, {
        status: 'loaded',
        url,
        cssTexts: cssPayload.cssTexts,
      });
    } else {
      // TODO: extract the logic only needed for assets from deserializeArg
      const result = (await deserializeArg(
        new Map(),
        null,
        status,
      )(payload as SerializedCanvasArg)) as Blob | MediaSource;
      const objectURL = URL.createObjectURL(result);
      let assets = this.originalToObjectURLMap.get(url);
      if (!assets) {
        assets = new Map();
        this.originalToObjectURLMap.set(url, assets);
      }
      assets.set(event.timestamp, objectURL);
      this.loadingURLs.delete(url);
      this.failedURLs.delete(url);
      this.executeCallbacks(url, { status: 'loaded', url: objectURL });
    }
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
    let tsResult: Map<number, string> | Map<number, string[]> | undefined;
    tsResult = this.urlToStylesheetMap.get(url);
    if (!tsResult) {
      tsResult = this.originalToObjectURLMap.get(url);
    }
    if (tsResult) {
      let result;
      let bestTs: number | null = null;
      // pick the asset with a timestamp closest to the current replayer value
      // preferring ones that loaded after (assuming these are the ones that
      // were triggered by the most recently played snapshot)
      tsResult.forEach((value, ts) => {
        if (bestTs === null) {
          result = value;
          bestTs = ts;
        } else if (this.replayerApproxTs <= ts) {
          if (bestTs < this.replayerApproxTs || ts < bestTs) {
            result = value;
            bestTs = ts;
          }
        } else if (bestTs < ts) {
          result = value;
          bestTs = ts;
        }
      });
      if (result === undefined) {
        // satisfy typings
      } else if (this.urlToStylesheetMap.has(url)) {
        return {
          status: 'loaded',
          url,
          cssTexts: result,
        };
      } else {
        return {
          status: 'loaded',
          url: result,
        };
      }
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
    serializedValue: string,
    serializedNode?: serializedElementNodeWithId,
  ): Promise<unknown> {
    const preloadedStatus = this.get(serializedValue);

    let isCssTextElement = false;
    if (node.nodeName === 'STYLE') {
      // includes <link>s (these are recreated as <style> elements)
      isCssTextElement = true;
    }
    const prevValue = node.getAttribute(attribute);

    const promises: Promise<unknown>[] = [];

    if (attribute === 'srcset') {
      const values = getSourcesFromSrcset(serializedValue);
      let expectedValue: string | null = prevValue;
      values.forEach((value) => {
        promises.push(
          this.whenReady(value).then((status) => {
            const isLoaded = status.status === 'loaded';
            if (!isLoaded) {
              if (!this.liveMode && !isCssTextElement) {
                // failed to load asset, revert to recorded value
                node.setAttribute(attribute, serializedValue);
              }
              return; // failed to load asset
            }

            if (!isCssTextElement) {
              const attributeUnchanged =
                node.getAttribute(attribute) === expectedValue;

              if (!attributeUnchanged) return; // attribute was changed since we started loading the asset
            }
            if (!expectedValue) {
              // before srcset has been set for the first time
              expectedValue = serializedValue;
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
    } else if (
      preloadedStatus.status === 'loaded' &&
      preloadedStatus.cssTexts &&
      serializedNode
    ) {
      // this is the case with preloadAllAssets; we can build immediately as unlike images, there's no asynchronous rebuild step
      buildStyleNode(
        serializedNode,
        node as HTMLStyleElement,
        preloadedStatus.cssTexts.join('/* rr_split */'),
        {
          hackCss: true, // seems to be always true in this package
          cache: this.cache,
        },
      );
    } else {
      // In live mode we removes the attribute while it loads so it doesn't show the broken image icon
      if (this.liveMode && nodeId > 0 && !isCssTextElement) {
        let hijackedAttributes = this.nodeIdAttributeHijackedMap.get(nodeId);
        if (!hijackedAttributes) {
          hijackedAttributes = new Map();
          this.nodeIdAttributeHijackedMap.set(nodeId, hijackedAttributes);
        }
        hijackedAttributes.set(attribute, serializedValue);
        if (node.tagName === 'IMG' && attribute === 'src') {
          // special value to prevent a broken image icon while asset is being loaded
          node.setAttribute('src', '//:0');
        }
      }
      promises.push(
        this.whenReady(serializedValue).then((status) => {
          const isLoaded = status.status === 'loaded';
          if (!isLoaded) {
            if (!this.liveMode && !isCssTextElement) {
              // failed to load asset, revert to recorded value
              node.setAttribute(attribute, serializedValue);
            }
            return;
          }
          if (!isCssTextElement) {
            const attributeUnchanged = this.liveMode
              ? serializedValue ===
                this.nodeIdAttributeHijackedMap.get(nodeId)?.get(attribute)
              : node.getAttribute(attribute) === prevValue;

            if (!attributeUnchanged) return; // attribute was changed since we started loading the asset
          }
          if (status.cssTexts) {
            buildStyleNode(
              serializedNode || (node as HTMLStyleElement),
              node as HTMLStyleElement,
              status.cssTexts.join('/* rr_split */'),
              {
                hackCss: true, // seems to be always true in this package
                cache: this.cache,
              },
            );
          } else {
            node.setAttribute(attribute, status.url);
          }
        }),
      );
    }

    return Promise.all(promises);
  }
}
