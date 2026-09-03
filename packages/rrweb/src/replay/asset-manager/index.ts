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
  private srcsetWatchers: Array<{
    node: Element | RRElement;
    srcsetValue: string;
    candidates: string[];
  }> = [];
  private loadingURLs: Set<string> = new Set();
  private failedURLs: Set<string> = new Set();
  private callbackMap: Map<
    string,
    Array<(status: RebuildAssetManagerFinalStatus) => void>
  > = new Map();
  private liveMode: boolean;
  private cache: BuildCache;
  public replayerApproxTs = 0;

  // Assets which are render-blocking for a FullSnapshot, i.e. should delay rebuild until they are ready
  public fullSnapshotOutstanding: Map<
    string,
    Promise<unknown>
  > | null = null;

  constructor({ liveMode, cache }: { liveMode: boolean; cache: BuildCache }) {
    this.liveMode = liveMode;
    this.cache = cache;
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
      this.tryReconstructSrcsets(url);
    }
  }

  public reconstructSrcsetWhenComplete(
    node: Element | RRElement,
    srcsetValue: string,
  ) {
    // the srcset may have changed (mutation): drop any prior watcher and clear
    // the now-stale reconstructed srcset so the pinned src shows again until the
    // new candidate set is ready
    this.srcsetWatchers = this.srcsetWatchers.filter((w) => w.node !== node);
    if (node.getAttribute('srcset')) {
      node.removeAttribute('srcset');
    }
    const candidates = getSourcesFromSrcset(srcsetValue);
    if (candidates.length === 0) {
      return;
    }
    if (this.candidatesAllLoaded(candidates)) {
      this.reconstructSrcset(node, srcsetValue, candidates);
      return;
    }
    this.srcsetWatchers.push({ node, srcsetValue, candidates });
  }

  private candidatesAllLoaded(candidates: string[]): boolean {
    return candidates.every((url) => this.get(url).status === 'loaded');
  }

  private tryReconstructSrcsets(loadedUrl: string) {
    for (let i = this.srcsetWatchers.length - 1; i >= 0; i--) {
      const watcher = this.srcsetWatchers[i];
      if (!watcher.candidates.includes(loadedUrl)) {
        continue;
      }
      if (this.candidatesAllLoaded(watcher.candidates)) {
        this.srcsetWatchers.splice(i, 1);
        this.reconstructSrcset(
          watcher.node,
          watcher.srcsetValue,
          watcher.candidates,
        );
      }
    }
  }

  private reconstructSrcset(
    node: Element | RRElement,
    srcsetValue: string,
    candidates: string[],
  ) {
    let rebuilt: string | null = srcsetValue;
    for (const original of candidates) {
      const status = this.get(original);
      if (status.status === 'loaded') {
        rebuilt = updateSrcset(
          node,
          original,
          status.url,
          rebuilt ?? srcsetValue,
        );
      }
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

  /**
   * Mark an asset as failed if it hasn't arrived in time
   * `whenReady` sees the 'failed' status and can provide a fallback
   */
  public failAsset(url: string) {
    if (this.get(url).status === 'loaded') {
      return;
    }
    this.failedURLs.add(url);
    this.executeCallbacks(url, { status: 'failed' });
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
    const promises: Promise<unknown>[] = [];

    if (
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
      if (nodeId > 0 && !isCssTextElement) {
        let hijackedAttributes = this.nodeIdAttributeHijackedMap.get(nodeId);
        if (!hijackedAttributes) {
          hijackedAttributes = new Map();
          this.nodeIdAttributeHijackedMap.set(nodeId, hijackedAttributes);
        }
        hijackedAttributes.set(attribute, serializedValue);
      }

      if (node.tagName === 'IMG' && attribute === 'src') {
        if (
          preloadedStatus.status === 'unknown' &&
          node.getAttribute(attribute) === null
        ) {
          if (this.liveMode) {
            // special value to prevent a broken image icon while asset is being loaded
            node.setAttribute('src', '//:0');
          } else {
            // we don't have any confidence that image will load as an asset
            // as it should have showed up via preloadAllAssets.
            // set it to the potentially broken original value
            node.setAttribute('src', serializedValue);
          }
        }
      }
      const whenReadyPromise = this.whenReady(serializedValue).then(
        (status) => {
          if (status.status !== 'loaded') {
            // only 'failed' should be possible
            // failed to load asset, try to revert to recorded value
            if (isCssTextElement) {
              if (
                attribute === 'href' &&
                /^https?:\/\//i.test(serializedValue)
              ) {
                // As we convert <link rel=stylesheet href="..."> to a <style> element
                // reverting the href attribute directly wouldn't work
                const styleEl = node as HTMLStyleElement;

                // see `escapeImportStatement` for first use of this JSON.stringify approach
                const inlinedLink = `@import url(${JSON.stringify(
                  serializedValue,
                )});`;
                buildStyleNode(styleEl, styleEl, inlinedLink, {
                  hackCss: false,
                  cache: this.cache,
                });
              }
            } else {
              node.setAttribute(attribute, serializedValue);
            }
            return;
          }
          if (!isCssTextElement) {
            if (
              serializedValue !==
              this.nodeIdAttributeHijackedMap.get(nodeId)?.get(attribute)
            ) {
              // attribute was changed since we started loading the asset
              return;
            }
          }
          let rebuildTarget: serializedElementNodeWithId | HTMLStyleElement;
          if (node.childNodes || !serializedNode) {
            // presence of childNodes indicates it has already been built (although should really check mirror)
            // so it is too late to use the serializedNode
            rebuildTarget = node as HTMLStyleElement;
          } else {
            rebuildTarget = serializedNode;
          }
          if (status.cssTexts) {
            buildStyleNode(
              rebuildTarget,
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
        },
      );
      promises.push(whenReadyPromise);
      if (isCssTextElement) {
        // also includes <link>s which are not render-blocking for the fullsnapshot
        // but which in most browsers do delay record time rendering, so we should delay rebuild likewise
        this.fullSnapshotOutstanding?.set(
          serializedValue,
          whenReadyPromise,
        );
      }
    }

    return Promise.all(promises);
  }
}
