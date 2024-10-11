import type {
  IWindow,
  SerializedCanvasArg,
  SerializedCssTextArg,
  eventWithTime,
  listenerHandler,
  asset,
  captureAssetsParam,
  assetStatus,
} from '@rrweb/types';
import type { assetCallback } from '@rrweb/types';
import { encode } from 'base64-arraybuffer';

import { patch } from '../../utils';

import type { recordOptions, ProcessingStyleElement } from '../../types';
import {
  getSourcesFromSrcset,
  shouldCaptureAsset,
  stringifyCssRules,
  absolutifyURLs,
  splitCssText,
} from 'rrweb-snapshot';

export function isProcessingStyleElement(
  el: Element,
): el is ProcessingStyleElement {
  return '__rrProcessingStylesheet' in el;
}

export default class AssetManager {
  private urlObjectMap = new Map<string, File | Blob | MediaSource>();
  private urlTextMap = new Map<string, string>();
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
    this.urlTextMap.clear();
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

    if (this.config.objectURLs || this.config.images) {
      try {
        // monkeypatching allows us to store object blobs when they are created
        // so that we don't have to perform a slower `fetch` in order to serialize them
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

  public async getURLObject(
    url: string,
  ): Promise<File | Blob | MediaSource | string | null> {
    const object = this.urlObjectMap.get(url);
    if (object) {
      return object;
    }
    const text = this.urlTextMap.get(url);
    if (text) {
      return text;
    }

    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/css')) {
        return await response.text();
      } else {
        return await response.blob();
      }
    } catch (e) {
      console.warn(`getURLObject failed for ${url}`);
      throw e;
    }
  }

  private captureStylesheet(
    sheetBaseHref: string,
    el: HTMLLinkElement | HTMLStyleElement,
    styleId?: number,
  ): assetStatus {
    let cssRules: CSSRuleList;
    let url = sheetBaseHref; // linkEl.href for a link element
    if (styleId) {
      url += `#rr_css_text:${styleId}`;
    }
    try {
      cssRules = el.sheet!.cssRules;
    } catch (e) {
      if (el.tagName === 'STYLE') {
        // sheetBaseHref represents the document url the style element is embedded in so can't be fetched
        return {
          url,
          status: 'refused',
        };
      }
      if (this.capturedURLs.has(url)) {
        return {
          url,
          status: 'captured',
        };
      } else if (this.capturingURLs.has(url)) {
        return {
          url,
          status: 'capturing',
        };
      } else if (this.failedURLs.has(url)) {
        return {
          url,
          status: 'error',
        };
      }
      this.capturingURLs.add(url);
      // stylesheet could not be found or
      // is not readable due to CORS, fallback to fetch
      void this.getURLObject(url)
        .then((cssText) => {
          this.capturedURLs.add(url);
          this.capturingURLs.delete(url);

          if (cssText && typeof cssText === 'string') {
            const payload: SerializedCssTextArg = {
              rr_type: 'CssText',
              cssTexts: [absolutifyURLs(cssText, sheetBaseHref)],
            };
            this.mutationCb({
              url,
              payload,
            });
          }
        })
        .catch(this.fetchCatcher(url));
      return {
        url,
        status: 'capturing', // 'processing' ?
      };
    }
    const processStylesheet = () => {
      cssRules = el.sheet!.cssRules; // update, as a mutation may have since occurred
      const cssText = stringifyCssRules(cssRules, sheetBaseHref);
      const payload: SerializedCssTextArg = {
        rr_type: 'CssText',
        cssTexts: [cssText],
      };
      if (styleId) {
        if (el.childNodes.length > 1) {
          payload.cssTexts = splitCssText(cssText, el as HTMLStyleElement);
        }
        this.mutationCb({
          url: `rr_css_text:${styleId}`,
          payload,
        });
      } else {
        this.mutationCb({
          url: sheetBaseHref,
          payload,
        });
      }
      if (isProcessingStyleElement(el)) {
        delete el.__rrProcessingStylesheet;
      }
    };
    let timeout = this.config.processStylesheetsWithin;
    if (!timeout && timeout !== 0) {
      timeout = 2000;
    }
    if (window.requestIdleCallback !== undefined && timeout > 0) {
      if (el.tagName === 'STYLE') {
        // mark it so mutations on it can be ignored until processed
        (el as ProcessingStyleElement).__rrProcessingStylesheet = true;
        // process inline style elements before external links
        // as they are more integral to the page and more likely
        // to only appear on this page (can't be reconstructed if lost)
        timeout = Math.floor(timeout / 2);
      }
      // try not to clog up main thread
      requestIdleCallback(processStylesheet, {
        timeout,
      });
      return {
        url,
        status: 'capturing', // 'processing' ?
        timeout,
      };
    } else {
      processStylesheet();
      return {
        url,
        status: 'captured',
      };
    }
  }

  public capture(asset: asset): assetStatus | assetStatus[] {
    if ('sheet' in asset.element) {
      return this.captureStylesheet(
        asset.value,
        asset.element as HTMLStyleElement | HTMLLinkElement,
        asset.styleId,
      );
    } else if (asset.attr === 'srcset') {
      const statuses: assetStatus[] = [];
      getSourcesFromSrcset(asset.value).forEach((url) => {
        statuses.push(this.captureUrl(url));
      });
      return statuses;
    } else {
      return this.captureUrl(asset.value);
    }
  }

  private captureUrl(url: string): assetStatus {
    if (this.capturedURLs.has(url)) {
      return {
        url,
        status: 'captured',
      };
    } else if (this.capturingURLs.has(url)) {
      return {
        url,
        status: 'capturing',
      };
    } else if (this.failedURLs.has(url)) {
      return {
        url,
        status: 'error',
      };
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
      .catch(this.fetchCatcher(url));

    return {
      url,
      status: 'capturing',
    };
  }

  private fetchCatcher(url: string) {
    return (e: unknown) => {
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
    };
  }

  public shouldCapture(
    n: Element,
    attribute: string,
    value: string,
    config: captureAssetsParam,
  ): boolean {
    return shouldCaptureAsset(n, attribute, value, config);
  }
}
