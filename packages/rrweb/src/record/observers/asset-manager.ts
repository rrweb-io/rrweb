import type {
  IWindow,
  SerializedCanvasArg,
  SerializedCssTextArg,
  eventWithTime,
  listenerHandler,
  asset,
  captureAssetsParam,
  assetStatus,
  mutationCallBack,
} from '@rrweb/types';
import type { assetCallback } from '@rrweb/types';
import type { Mirror } from 'rrweb-snapshot';
import { encode } from 'base64-arraybuffer';

import { patch } from '@rrweb/utils';

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

// the content kind embedded in a data: url's virtual url for readability, e.g.
// `#rr_data_style:2` or `#rr_data_image:3` (font/document may be added later)
type dataAssetKind = 'image' | 'video' | 'audio' | 'style';

const STYLESHEET_PROCESSING_ESTIMATE = 100;
const DATA_URL_PROCESSING_ESTIMATE = 100;
const IDLE_TIMEOUT_STAGGER = 20;

export default class AssetManager {
  private urlObjectMap = new Map<string, File | Blob | MediaSource>();
  private urlTextMap = new Map<string, string>();
  private capturedURLs = new Set<string>();
  private capturingURLs = new Set<string>();
  private failedURLs = new Set<string>();
  // data: urls embed their content, so emitting them verbatim would duplicate
  // that (often large) content inline in the snapshot. Instead each distinct
  // data: url is mapped to a stable virtual url and emitted as a normal Asset
  // under it. Identical data: urls dedupe to the same virtual url / asset.
  private dataURLMap = new Map<string, string>();
  private dataURLCounter = 0;
  private pendingSnapshotAssetEmits: Array<() => void> = [];
  private pendingIdleStylesheets = 0;
  private resetHandlers: listenerHandler[] = [];
  private mutationCb: assetCallback;
  private attributeMutationCb: mutationCallBack;
  private mirror: Mirror;
  private imgSrcListenerAttached = new WeakSet<HTMLImageElement>();
  private imgLastCurrentSrc = new WeakMap<HTMLImageElement, string>();
  // base href of the recording frame, used only to namespace adopted-stylesheet
  // virtual urls so they don't collide across cross-origin iframes (which each
  // have their own styleId counter starting at 1)
  private baseHref: string;
  public readonly config: Exclude<
    recordOptions<eventWithTime>['captureAssets'],
    undefined
  >;

  public lastFullSnapshotTimestamp: number;

  public reset() {
    this.urlObjectMap.clear();
    this.urlTextMap.clear();
    this.capturedURLs.clear();
    this.capturingURLs.clear();
    this.failedURLs.clear();
    this.dataURLMap.clear();
    this.dataURLCounter = 0;
    this.pendingSnapshotAssetEmits = [];
    this.pendingIdleStylesheets = 0;
    this.resetHandlers.forEach((h) => h());
  }

  public flushSnapshotAssets() {
    const pending = this.pendingSnapshotAssetEmits;
    this.pendingSnapshotAssetEmits = [];
    for (const emit of pending) emit();
  }

  constructor(options: {
    mutationCb: assetCallback;
    attributeMutationCb: mutationCallBack;
    mirror: Mirror;
    win: IWindow;
    captureAssets: Exclude<
      recordOptions<eventWithTime>['captureAssets'],
      undefined
    >;
  }) {
    const { win } = options;

    this.mutationCb = options.mutationCb;
    this.attributeMutationCb = options.attributeMutationCb;
    this.mirror = options.mirror;
    this.config = options.captureAssets;
    this.baseHref = win.location.href;

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
    snapshotTimestamp?: number | true,
  ): assetStatus {
    let cssRules: CSSRuleList;
    if (sheetBaseHref.startsWith('data:')) {
      // a data: stylesheet's content is read from el.sheet below; emit it under
      // a virtual url so the (often large) data: url isn't duplicated inline
      sheetBaseHref = this.dataURLVirtualURL(sheetBaseHref, 'style');
    }
    let url = sheetBaseHref; // linkEl.href for a link element
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
          } catch (e1) {
            // deprecated Safari method
            linkAppliedQuery.addListener(() =>
              this.captureStylesheet(sheetBaseHref, el, styleId),
            );
          }
          return {
            url,
            status: 'media-mismatch',
          };
        } catch (e2) {
          // can't listen, go ahead and capture now
        }
      }
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
            this.mutationCb(
              {
                url,
                payload,
              },
              snapshotTimestamp === true
                ? this.lastFullSnapshotTimestamp
                : snapshotTimestamp,
            );
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
        this.mutationCb(
          {
            url,
            payload,
          },
          snapshotTimestamp === true
            ? this.lastFullSnapshotTimestamp
            : snapshotTimestamp,
        );
      } else {
        this.mutationCb(
          {
            url: sheetBaseHref,
            payload,
          },
          snapshotTimestamp === true
            ? this.lastFullSnapshotTimestamp
            : snapshotTimestamp,
        );
      }
      if (isProcessingStyleElement(el)) {
        delete el.__rrProcessingStylesheet;
      }
    };
    let { processStylesheetsWithin } = this.config;
    if (!processStylesheetsWithin && processStylesheetsWithin !== 0) {
      processStylesheetsWithin = 4000;
    }
    if (processStylesheetsWithin <= 0) {
      if (snapshotTimestamp === true) {
        this.pendingSnapshotAssetEmits.push(processStylesheet);
        return {
          url,
          status: 'capturing',
          timeout: STYLESHEET_PROCESSING_ESTIMATE,
        };
      }
      processStylesheet();
      return {
        url,
        status: 'captured',
      };
    } else if (window.requestIdleCallback !== undefined) {
      // Spread the idle-callback deadlines of stylesheets queued together so
      // that on a busy page that never goes idle, they don't all hit their
      // timeout and get dumped on the main thread at the same time.
      // Ultimate cure for a busy page is to increase the processStylesheetsWithin
      // limit and trust requestIdleCallback scheduling
      const midpoint = Math.floor(processStylesheetsWithin / 2);
      const stagger = this.pendingIdleStylesheets * IDLE_TIMEOUT_STAGGER;
      this.pendingIdleStylesheets += 1;
      let timeout: number;
      if (el.tagName === 'STYLE') {
        // mark it so mutations on it can be ignored until processed
        (el as ProcessingStyleElement).__rrProcessingStylesheet = true;
        // process inline style elements before external links
        // as they are more integral to the page and more likely
        // to only appear on this page (can't be reconstructed from @import fallback)
        timeout = Math.max(0, midpoint - stagger);
      } else {
        timeout = Math.min(processStylesheetsWithin, midpoint + stagger);
      }
      // try not to clog up main thread
      requestIdleCallback(() => {
        this.pendingIdleStylesheets -= 1;
        processStylesheet();
      }, { timeout });
      return {
        url,
        status: 'capturing', // 'processing' ?
        timeout,
      };
    } else {
      // fallback for e.g. iOS which doesn't have requestIdleCallback
      // we still defer so that it isn't emitted before FullSnapshot
      // and also so that we don't block the main thread.
      // don't use the `processStylesheetsWithin` variable
      // as that should be seen as a maximum delay and not a minimum
      setTimeout(processStylesheet, 0);
      return {
        url,
        status: 'capturing', // 'processing' ?
        timeout: STYLESHEET_PROCESSING_ESTIMATE,
      };
    }
  }

  /**
   * Create or reuse the virtual url under which a data: url's content is emitted
   * as an Asset. The data: url itself can be very large, so referencing it by a
   * short virtual url (mirroring the #rr_style_el: / #rr_adopted_style: scheme)
   * keeps it out of the snapshot. The `kind` (image/video/audio/style/...) is
   * embedded for legibility during storage and doesn't matter for replay assignment
   * as the numeric id is unique across all assets emitted.
   * Identical `data:` urls map to the same url so only one asset is emitted
   */
  private dataURLVirtualURL(dataURL: string, kind: dataAssetKind): string {
    const existing = this.dataURLMap.get(dataURL);
    if (existing) {
      return existing;
    }
    const url = `${this.baseHref}#rr_data_${kind}:${++this.dataURLCounter}`;
    this.dataURLMap.set(dataURL, url);
    return url;
  }

  /**
   * Classify the asset kind of a (non-stylesheet) element so its data: virtual
   * url reflects the content type. Defaults to 'image' for the generic
   * capturable attributes (object/embed data, backgrounds, svg images).
   */
  private mediaKind(element: HTMLElement): dataAssetKind {
    const name = element.nodeName;
    if (name === 'VIDEO') return 'video';
    if (name === 'AUDIO') return 'audio';
    if (name === 'SOURCE') {
      const parent = element.parentNode?.nodeName;
      if (parent === 'VIDEO') return 'video';
      if (parent === 'AUDIO') return 'audio';
    }
    return 'image';
  }

  /**
   * The virtual url which references the Asset event holding an adopted
   * (constructed) stylesheet's css text. The styleId is embedded in the url so
   * that the replay side can recover it without a separate field.
   */
  public adoptedStyleSheetURL(styleId: number): string {
    return `${this.baseHref}#rr_adopted_style:${styleId}`;
  }

  /**
   * Emit the css content of an adopted (constructed) stylesheet as a separate
   * Asset event and return the virtual url which references it. The adopted
   * stylesheet event stores the synthetic url instead of inline css. This
   * allows repeated content both between and within recordings to be handled
   * separately as an Asset. Only called the first time a given stylesheet is
   * encountered.
   */
  public captureAdoptedStyleSheet(styleId: number, cssText: string): string {
    const url = this.adoptedStyleSheetURL(styleId);
    const payload: SerializedCssTextArg = {
      rr_type: 'CssText',
      cssTexts: [cssText],
    };
    this.mutationCb({
      url,
      payload,
    });
    return url;
  }

  public capture(
    asset: asset,
    snapshotTimestamp?: number | true,
  ): assetStatus {
    if ('sheet' in asset.element) {
      const status = this.captureStylesheet(
        asset.value,
        asset.element as HTMLStyleElement | HTMLLinkElement,
        asset.styleId,
        snapshotTimestamp,
      );
      status.renderBlocking = true;
      return status;
    } else if ([
      'srcset',
      'src',  // <img> within <picture>
    ].includes(asset.attr) && asset.element.tagName === 'IMG') {
      const image = asset.element as HTMLImageElement;
      const isResponsive =
        image.getAttribute('srcset') !== null ||
        image.parentElement?.nodeName === 'PICTURE';
      if (isResponsive) {
        this.trackImageSrcChanges(image);
        if (this.config.sources === 'all') {
          this.captureAllCandidates(image, snapshotTimestamp);
        }
        if (image.currentSrc) {
          this.imgLastCurrentSrc.set(image, image.currentSrc);
          return this.captureUrl(image.currentSrc, snapshotTimestamp);
        }
        return {
          url: asset.value,
          status: 'not-current-src',
        };
      }
    } else if (asset.element.tagName === 'SOURCE') {
      const parent = asset.element.parentElement;
      if (parent && ['VIDEO', 'AUDIO'].includes(parent.tagName)) {
        const mediaParent = parent as HTMLMediaElement;
        if (mediaParent.currentSrc !== asset.value) {
          return {
            url: asset.value,
            status: 'not-current-src',
          }
        }
      }
    }
    return this.captureUrl(
      asset.value,
      snapshotTimestamp,
      this.mediaKind(asset.element),
    );
  }

  private captureAllCandidates(
    image: HTMLImageElement,
    snapshotTimestamp?: number | true,
  ) {
    const srcsets: string[] = [];
    const ownSrcset = image.getAttribute('srcset');
    if (ownSrcset) {
      srcsets.push(ownSrcset);
    }
    const parent = image.parentElement;
    if (parent && parent.nodeName === 'PICTURE') {
      parent.querySelectorAll('source').forEach((source) => {
        const sourceSrcset = source.getAttribute('srcset');
        if (sourceSrcset) {
          srcsets.push(sourceSrcset);
        }
      });
    }
    const baseHref = image.ownerDocument?.baseURI;
    for (const srcset of srcsets) {
      for (const rawUrl of getSourcesFromSrcset(srcset)) {
        if (rawUrl.startsWith('data:')) {
          continue;
        }
        let url: string;
        try {
          url = baseHref ? new URL(rawUrl, baseHref).href : rawUrl;
        } catch (e) {
          continue;
        }
        this.captureUrl(url, snapshotTimestamp);
      }
    }
  }

  private trackImageSrcChanges(image: HTMLImageElement) {
    if (this.imgSrcListenerAttached.has(image)) {
      return;
    }
    this.imgSrcListenerAttached.add(image);
    image.addEventListener('load', () => {
      const currentSrc = image.currentSrc;
      if (!currentSrc || this.imgLastCurrentSrc.get(image) === currentSrc) {
        return;
      }
      this.imgLastCurrentSrc.set(image, currentSrc);
      const status = this.captureUrl(currentSrc);
      const id = this.mirror.getId(image);
      if (id > 0) {
        this.attributeMutationCb({
          adds: [],
          removes: [],
          texts: [],
          attributes: [
            {
              id,
              attributes: { rr_captured_src: status.url },
            },
          ],
        });
      }
    });
  }

  private captureUrl(
    url: string,
    snapshotTimestamp?: number | true,
    kind: dataAssetKind = 'image',
  ): assetStatus {
    // content is fetched from the original `url`, but the asset is emitted and
    // tracked under `emitUrl`; for data: urls this is a short virtual url so the
    // data: url isn't duplicated inline in the snapshot
    const emitUrl = url.startsWith('data:')
      ? this.dataURLVirtualURL(url, kind)
      : url;
    const renderBlocking = url.startsWith('data:');
    const timeout = renderBlocking ? DATA_URL_PROCESSING_ESTIMATE : undefined;
    if (this.capturedURLs.has(emitUrl)) {
      return {
        url: emitUrl,
        status: 'captured',
        renderBlocking,
      };
    } else if (this.capturingURLs.has(emitUrl)) {
      return {
        url: emitUrl,
        status: 'capturing',
        renderBlocking,
        timeout,
      };
    } else if (this.failedURLs.has(emitUrl)) {
      return {
        url: emitUrl,
        status: 'error',
        renderBlocking,
      };
    }
    this.capturingURLs.add(emitUrl);
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

            this.capturedURLs.add(emitUrl);
            this.capturingURLs.delete(emitUrl);

            this.mutationCb(
              {
                url: emitUrl,
                payload,
              },
              snapshotTimestamp === true
                ? renderBlocking
                  ? this.lastFullSnapshotTimestamp
                  : undefined
                : snapshotTimestamp,
            );
          }
        }
      })
      .catch(this.fetchCatcher(emitUrl));

    return {
      url: emitUrl,
      status: 'capturing',
      renderBlocking,
      timeout,
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
