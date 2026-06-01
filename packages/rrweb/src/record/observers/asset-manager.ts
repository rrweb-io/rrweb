import type {
  IWindow,
  SerializedCanvasArg,
  SerializedCssTextArg,
  asset,
  assetCallback,
  assetStatus,
  captureAssetsParam,
  eventWithTime,
  listenerHandler,
} from '@rrweb/types';
import { encode } from 'base64-arraybuffer';
import { patch } from '@rrweb/utils';
import {
  absolutifyURLs,
  getSourcesFromSrcset,
  shouldCaptureAsset,
  splitCssText,
  stringifyCssRules,
} from 'rrweb-snapshot';

import type { ProcessingStyleElement, recordOptions } from '../../types';

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

  public lastFullSnapshotTimestamp = 0;

  public reset() {
    this.urlObjectMap.clear();
    this.urlTextMap.clear();
    this.capturedURLs.clear();
    this.capturingURLs.clear();
    this.failedURLs.clear();
    this.resetHandlers.forEach((h) => h());
    this.resetHandlers = [];
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
      }
      return await response.blob();
    } catch (e) {
      console.warn(`getURLObject failed for ${url}`);
      throw e;
    }
  }

  private captureStylesheet(
    sheetBaseHref: string,
    el: HTMLLinkElement | HTMLStyleElement,
    styleId?: number,
    snapshotTimestamp?: number | true,
  ): assetStatus {
    let cssRules: CSSRuleList;
    let url = sheetBaseHref;
    if (styleId) {
      url += `#rr_style_el:${styleId}`;
    } else if (el.getAttribute('media') !== null) {
      const linkAppliedQuery = matchMedia(el.getAttribute('media') as string);
      if (!linkAppliedQuery.matches) {
        try {
          try {
            linkAppliedQuery.addEventListener('change', () =>
              this.captureStylesheet(sheetBaseHref, el, styleId),
            );
          } catch {
            linkAppliedQuery.addListener(() =>
              this.captureStylesheet(sheetBaseHref, el, styleId),
            );
          }
          return {
            url,
            status: 'media-mismatch',
          };
        } catch {
          // Cannot listen for media changes, so capture now.
        }
      }
    }
    const eventTimestamp = this.getEventTimestamp(snapshotTimestamp);

    try {
      cssRules = el.sheet!.cssRules;
    } catch (e) {
      if (el.tagName === 'STYLE') {
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
      }
      if (this.capturingURLs.has(url)) {
        return {
          url,
          status: 'capturing',
        };
      }
      if (this.failedURLs.has(url)) {
        return {
          url,
          status: 'error',
        };
      }
      this.capturingURLs.add(url);
      void this.getURLObject(url)
        .then((cssText) => {
          this.capturedURLs.add(url);
          this.capturingURLs.delete(url);

          if (cssText && typeof cssText === 'string') {
            const payload: SerializedCssTextArg = {
              rr_type: 'CssText',
              cssTexts: [absolutifyURLs(cssText, sheetBaseHref)],
            };
            this.mutationCb(
              {
                url,
                payload,
              },
              eventTimestamp,
            );
          }
        })
        .catch(this.fetchCatcher(url, eventTimestamp));
      return {
        url,
        status: 'capturing',
      };
    }

    const processStylesheet = () => {
      cssRules = el.sheet!.cssRules;
      const cssText = stringifyCssRules(cssRules, sheetBaseHref);
      const payload: SerializedCssTextArg = {
        rr_type: 'CssText',
        cssTexts: [cssText],
      };
      if (styleId) {
        if (el.childNodes.length > 1) {
          payload.cssTexts = splitCssText(cssText, el as HTMLStyleElement);
        }
        this.mutationCb(
          {
            url,
            payload,
          },
          eventTimestamp,
        );
      } else {
        this.mutationCb(
          {
            url: sheetBaseHref,
            payload,
          },
          eventTimestamp,
        );
      }
      if (isProcessingStyleElement(el)) {
        delete el.__rrProcessingStylesheet;
      }
    };

    let timeout = this.config.processStylesheetsWithin;
    if (!timeout && timeout !== 0) {
      timeout = 2000;
    }
    if (timeout <= 0) {
      processStylesheet();
      return {
        url,
        status: 'captured',
      };
    }
    if (window.requestIdleCallback !== undefined) {
      if (el.tagName === 'STYLE') {
        (el as ProcessingStyleElement).__rrProcessingStylesheet = true;
        timeout = Math.floor(timeout / 2);
      }
      requestIdleCallback(processStylesheet, {
        timeout,
      });
      return {
        url,
        status: 'capturing',
        timeout,
      };
    }

    setTimeout(processStylesheet, 0);
    return {
      url,
      status: 'capturing',
      timeout: 100,
    };
  }

  public capture(
    asset: asset,
    snapshotTimestamp?: number | true,
  ): assetStatus | assetStatus[] {
    if ('sheet' in asset.element) {
      return this.captureStylesheet(
        asset.value,
        asset.element as HTMLStyleElement | HTMLLinkElement,
        asset.styleId,
        snapshotTimestamp,
      );
    }
    if (asset.attr === 'srcset') {
      const statuses: assetStatus[] = [];
      getSourcesFromSrcset(asset.value).forEach((url) => {
        statuses.push(this.captureUrl(url, snapshotTimestamp));
      });
      return statuses;
    }
    return this.captureUrl(asset.value, snapshotTimestamp);
  }

  private captureUrl(
    url: string,
    snapshotTimestamp?: number | true,
  ): assetStatus {
    const eventTimestamp = this.getEventTimestamp(snapshotTimestamp);
    if (this.capturedURLs.has(url)) {
      return {
        url,
        status: 'captured',
      };
    }
    if (this.capturingURLs.has(url)) {
      return {
        url,
        status: 'capturing',
      };
    }
    if (this.failedURLs.has(url)) {
      return {
        url,
        status: 'error',
      };
    }
    this.capturingURLs.add(url);
    void this.getURLObject(url)
      .then(async (object) => {
        if (object && (object instanceof File || object instanceof Blob)) {
          const arrayBuffer = await object.arrayBuffer();
          const base64 = encode(arrayBuffer);

          const payload: SerializedCanvasArg = {
            rr_type: 'Blob',
            type: object.type,
            data: [
              {
                rr_type: 'ArrayBuffer',
                base64,
              },
            ],
          };

          this.capturedURLs.add(url);
          this.capturingURLs.delete(url);

          this.mutationCb(
            {
              url,
              payload,
            },
            eventTimestamp,
          );
        }
      })
      .catch(this.fetchCatcher(url, eventTimestamp));

    return {
      url,
      status: 'capturing',
    };
  }

  private getEventTimestamp(snapshotTimestamp?: number | true) {
    return snapshotTimestamp === true
      ? this.lastFullSnapshotTimestamp
      : snapshotTimestamp;
  }

  private fetchCatcher(url: string, snapshotTimestamp?: number) {
    return (e: unknown) => {
      let message = '';
      if (e instanceof Error) {
        message = e.message;
      } else if (typeof e === 'string') {
        message = e;
      } else if (e && typeof e === 'object' && 'toString' in e) {
        message = (e as { toString(): string }).toString();
      }
      this.mutationCb(
        {
          url,
          failed: {
            message,
          },
        },
        snapshotTimestamp,
      );

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
