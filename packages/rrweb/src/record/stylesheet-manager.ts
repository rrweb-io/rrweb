import { stringifyCssRules, stringifyRule } from 'rrweb-snapshot';
import type {
  elementNode,
  serializedNodeWithId,
  adoptedStyleSheetCallback,
  adoptedStyleSheetParam,
  attributeMutation,
  mutationCallBack,
} from '@rrweb/types';
import { StyleSheetMirror } from '../utils';
import type AssetManager from './observers/asset-manager';

export class StylesheetManager {
  private trackedLinkElements: WeakSet<HTMLLinkElement> = new WeakSet();
  private mutationCb: mutationCallBack;
  private adoptedStyleSheetCb: adoptedStyleSheetCallback;
  private assetManager: AssetManager;
  public styleMirror = new StyleSheetMirror();
  // pending stability timers for newly-adopted stylesheets, keyed by styleId
  private adoptedStyleSheetTimers = new Map<
    number,
    ReturnType<typeof setTimeout>
  >();
  // styleIds whose asset has not yet been captured. While a styleId is blocked,
  // rule mutations on its stylesheet are suppressed (see observer.ts) so they
  // don't duplicate the css that the deferred asset will contain.
  private blockedStyleIds = new Set<number>();
  // how long a new adopted stylesheet's rule count must stay unchanged before
  // its css is captured as an asset (see adoptStyleSheetsAsAssets)
  private adoptedStyleSheetStabilityDelay = 50;

  constructor(options: {
    mutationCb: mutationCallBack;
    adoptedStyleSheetCb: adoptedStyleSheetCallback;
    assetManager: AssetManager;
  }) {
    this.mutationCb = options.mutationCb;
    this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
    this.assetManager = options.assetManager;
  }

  public attachLinkElement(
    linkEl: HTMLLinkElement,
    childSn: serializedNodeWithId,
  ) {
    // a mutation rather than an asset event so that we record the timestamp that the stylesheet was loaded
    if (
      '_cssText' in (childSn as elementNode).attributes ||
      'rr_captured_href' in (childSn as elementNode).attributes
    ) {
      this.mutationCb({
        adds: [],
        removes: [],
        texts: [],
        attributes: [
          {
            id: childSn.id,
            attributes: (childSn as elementNode)
              .attributes as attributeMutation['attributes'],
          },
        ],
      });
    }

    this.trackLinkElement(linkEl);
  }

  public trackLinkElement(linkEl: HTMLLinkElement) {
    if (this.trackedLinkElements.has(linkEl)) return;

    this.trackedLinkElements.add(linkEl);
    this.trackStylesheetInLinkElement(linkEl);
  }

  public adoptStyleSheets(
    sheets: CSSStyleSheet[] | readonly CSSStyleSheet[],
    hostId: number,
    docBaseHref: string,
  ) {
    if (sheets.length === 0) return;
    if (this.assetManager.config.adoptedStylesheetAssets) {
      this.adoptStyleSheetsAsAssets(sheets, hostId, docBaseHref);
      return;
    }
    const adoptedStyleSheetData: adoptedStyleSheetParam = {
      id: hostId,
      styleIds: [] as number[],
    };
    const styles: NonNullable<adoptedStyleSheetParam['styles']> = [];
    for (const sheet of sheets) {
      let styleId;
      if (!this.styleMirror.has(sheet)) {
        styleId = this.styleMirror.add(sheet);
        const rules = Array.from(sheet.rules || CSSRule, (r, index) => ({
          rule: stringifyRule(r, sheet.href),
          index,
        }));
        styles.push({ styleId, rules });
      } else styleId = this.styleMirror.getId(sheet);
      adoptedStyleSheetData.styleIds.push(styleId);
    }
    if (styles.length > 0) adoptedStyleSheetData.styles = styles;
    this.adoptedStyleSheetCb(adoptedStyleSheetData);
  }

  private adoptStyleSheetsAsAssets(
    sheets: CSSStyleSheet[] | readonly CSSStyleSheet[],
    hostId: number,
    docBaseHref: string,
  ) {
    // Emit the AdoptedStyleSheet event immediately (with the correct
    // timestamp), referencing each stylesheet by a virtual url whose trailing
    // segment is its styleId. A newly-adopted sheet gets its styleId assigned
    // now (so it is tracked) but is marked "blocked": its css asset is not
    // captured until its rule count has been stable for
    // `adoptedStyleSheetStabilityDelay`, and while blocked its rule mutations
    // are suppressed (see observer.ts). A constructed stylesheet is often
    // adopted while empty and populated immediately after; deferring the asset
    // this way captures a single complete asset rather than an empty asset plus
    // follow-up rule mutations (which would also duplicate the css on replay).
    const assetUrls: string[] = [];
    for (const sheet of sheets) {
      if (!this.styleMirror.has(sheet)) {
        const styleId = this.styleMirror.add(sheet);
        this.blockedStyleIds.add(styleId);
        this.scheduleAdoptedStyleSheetAsset(sheet, styleId, docBaseHref);
        assetUrls.push(this.assetManager.adoptedStyleSheetURL(styleId));
      } else {
        assetUrls.push(
          this.assetManager.adoptedStyleSheetURL(this.styleMirror.getId(sheet)),
        );
      }
    }
    this.adoptedStyleSheetCb({ id: hostId, assetUrls });
  }

  private scheduleAdoptedStyleSheetAsset(
    sheet: CSSStyleSheet,
    styleId: number,
    docBaseHref: string,
  ) {
    let lastCount = this.ruleCount(sheet);
    const check = () => {
      const count = this.ruleCount(sheet);
      if (count === lastCount) {
        this.adoptedStyleSheetTimers.delete(styleId);
        this.captureAdoptedStyleSheetAsset(sheet, styleId, docBaseHref);
      } else {
        lastCount = count;
        this.adoptedStyleSheetTimers.set(
          styleId,
          setTimeout(check, this.adoptedStyleSheetStabilityDelay),
        );
      }
    };
    this.adoptedStyleSheetTimers.set(
      styleId,
      setTimeout(check, this.adoptedStyleSheetStabilityDelay),
    );
  }

  private captureAdoptedStyleSheetAsset(
    sheet: CSSStyleSheet,
    styleId: number,
    docBaseHref: string,
  ) {
    // serialize via the same path as <link>/<style> assets: stringifyCssRules
    // applies fixBrowserCompatibilityIssuesInCSS, and absolutifies relative
    // url()s. An adopted sheet is always constructed, so its own href is null;
    // the browser resolves its url()s against the host document's base, so we
    // pass that (threaded from the adopting host, for multi-document support).
    const cssText = stringifyCssRules(sheet.cssRules, docBaseHref);
    this.assetManager.captureAdoptedStyleSheet(styleId, cssText);
    // unblock only after the asset is emitted, so subsequent rule mutations are
    // recorded relative to the captured css
    this.blockedStyleIds.delete(styleId);
  }

  public isStyleSheetBlocked(styleId: number): boolean {
    return this.blockedStyleIds.has(styleId);
  }

  private ruleCount(sheet: CSSStyleSheet): number {
    try {
      return sheet.cssRules.length;
    } catch (e) {
      return 0;
    }
  }

  public reset() {
    this.adoptedStyleSheetTimers.forEach((timer) => clearTimeout(timer));
    this.adoptedStyleSheetTimers.clear();
    this.blockedStyleIds.clear();
    this.styleMirror.reset();
    this.trackedLinkElements = new WeakSet();
  }

  // TODO: take snapshot on stylesheet reload by applying event listener
  private trackStylesheetInLinkElement(_linkEl: HTMLLinkElement) {
    // linkEl.addEventListener('load', () => {
    //   // re-loaded, maybe take another snapshot?
    // });
  }
}
