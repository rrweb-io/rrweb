import type {
  RebuildAssetManagerFinalStatus,
  RebuildAssetManagerInterface,
  RebuildAssetManagerStatus,
  assetEvent,
  SerializedCssTextArg,
  SerializedCanvasArg,
} from '@rrweb/types';
import { deserializeArg } from '../canvas/deserialize-args';
import {
  getSourcesFromSrcset,
  buildStyleNode,
  BuildCache,
} from 'rrweb-snapshot';
import type { RRElement } from 'rrdom';
import { updateSrcset } from './update-srcset';

export default class AssetManager implements RebuildAssetManagerInterface {
  private originalToObjectURLMap: Map<string, string> = new Map();
  private urlToStylesheetMap: Map<string, string> = new Map();
  private urlToStylesheetSplitsMap: Map<string, number[]> = new Map();
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

  constructor({ liveMode, cache }: { liveMode: boolean; cache: BuildCache }) {
    this.liveMode = liveMode;
    this.cache = cache;
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
      this.urlToStylesheetMap.set(url, cssPayload.cssText);
      if (cssPayload.splits) {
        this.urlToStylesheetSplitsMap.set(url, cssPayload.splits);
      }
      this.loadingURLs.delete(url);
      this.executeCallbacks(url, {
        status: 'loaded',
        url,
        cssText: cssPayload.cssText,
        cssTextSplits: cssPayload.splits,
      });
    } else {
      // TODO: extract the logic only needed for assets from deserializeArg
      const result = (await deserializeArg(
        new Map(),
        null,
        status,
      )(payload as SerializedCanvasArg)) as Blob | MediaSource;
      const objectURL = URL.createObjectURL(result);
      this.originalToObjectURLMap.set(url, objectURL);
      this.loadingURLs.delete(url);
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
    let result = this.urlToStylesheetMap.get(url);
    if (result) {
      return {
        status: 'loaded',
        url,
        cssText: result,
        cssTextSplits: this.urlToStylesheetSplitsMap.get(url),
      };
    }

    result = this.originalToObjectURLMap.get(url);

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
    serializedValue: string | number,
  ): Promise<unknown> {
    const newValue =
      typeof serializedValue === 'string'
        ? serializedValue
        : `rr_css_text:${serializedValue}`;

    let isCssTextElement = false;
    if (node.nodeName === 'STYLE') {
      // includes <link>s (these are recreated as <style> elements)
      isCssTextElement = true;
    }
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
              if (!this.liveMode && !isCssTextElement) {
                // failed to load asset, revert to recorded value
                node.setAttribute(attribute, newValue);
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
      if (this.liveMode && nodeId > 0 && !isCssTextElement) {
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
            if (!this.liveMode && !isCssTextElement) {
              // failed to load asset, revert to recorded value
              node.setAttribute(attribute, newValue);
            }
            return;
          }
          if (!isCssTextElement) {
            const attributeUnchanged = this.liveMode
              ? newValue ===
                this.nodeIdAttributeHijackedMap.get(nodeId)?.get(attribute)
              : node.getAttribute(attribute) === prevValue;

            if (!attributeUnchanged) return; // attribute was changed since we started loading the asset
          }
          if (status.cssText) {
            buildStyleNode(
              node, // buildStyleNode also accepts serializedElementNodeWithId here
              node as HTMLStyleElement,
              status.cssText,
              status.cssTextSplits || [],
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

  public reset(): void {
    this.originalToObjectURLMap.forEach((objectURL) => {
      URL.revokeObjectURL(objectURL);
    });
    this.originalToObjectURLMap.clear();
    this.urlToStylesheetMap.clear();
    this.urlToStylesheetSplitsMap.clear();
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
